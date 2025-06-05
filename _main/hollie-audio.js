/**
 * Hollie Audio System
 * Self-contained procedural music generator using Web Audio API
 * Activates on first tap and persists globally across all visualizations
 */

class HollieAudio {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.isPlaying = false;
        this.oscillators = [];
        this.filters = [];
        this.reverb = null;
        this.delay = null;
        this.evolutionTimer = null;
          // Musical parameters - 8-bit inspired
        this.baseFreq = 110; // A2
        this.scale = [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2]; // Just intonation
        this.pentatonic = [1, 9/8, 5/4, 3/2, 5/3]; // Classic 8-bit pentatonic
        this.modes = {
            ionian: [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2],
            dorian: [1, 9/8, 6/5, 4/3, 3/2, 5/3, 9/5, 2],
            phrygian: [1, 16/15, 6/5, 4/3, 3/2, 8/5, 9/5, 2],
            lydian: [1, 9/8, 5/4, 45/32, 3/2, 5/3, 15/8, 2],
            mixolydian: [1, 9/8, 5/4, 4/3, 3/2, 5/3, 16/9, 2],
            aeolian: [1, 9/8, 6/5, 4/3, 3/2, 8/5, 16/9, 2],
            locrian: [1, 16/15, 6/5, 4/3, 64/45, 8/5, 16/9, 2]        };
        this.currentMode = 'ionian';
        
        // Standardized tempo system (72-111 BPM range)
        this.minTempo = 72;
        this.maxTempo = 111;
        this.tempo = 90; // Start in middle of range
        this.targetTempo = 90;
        this.tempoTransitionSpeed = 0.1; // How fast tempo changes occur
        this.lastTempoChange = 0; // Track when we last changed tempo
        
        this.beatDuration = 60 / this.tempo; // seconds per beat
        this.timeSignature = [4, 4]; // Fixed 4/4 time signature
        this.measureDuration = this.beatDuration * 4; // Always 4 beats per measure
        this.phase = 0;
        this.harmonics = [];
        this.currentMeasure = 0;
        this.currentBeat = 0;
        
        // Infinite procedural structure
        this.currentSection = 0;
        this.sectionMeasure = 0;
        this.nextSectionLength = this.generateSectionLength();
        this.currentKey = 0; // Relative to base frequency
        this.chordProgression = [];
        this.currentChord = 0;
        this.musicalThemes = [];
        this.currentTheme = null;
        this.developmentStage = 0; // How far we've developed the current theme
        
        // Procedural rhythm patterns
        this.rhythmPatterns = {
            kick: [],
            snare: [],
            hihat: [],
            melody: [],
            bass: []
        };
        this.currentRhythmSet = 0;
        
        // 8-bit specific parameters
        this.channels = {
            pulse1: null,    // Main melody
            pulse2: null,    // Harmony/counter-melody
            triangle: null,  // Bass
            noise: null,     // Percussion (simulated)
            arp: null        // Arpeggiated accompaniment
        };
        this.dutyPulse = 0.25; // 25% duty cycle for square waves
        this.arpeggioPattern = [0, 2, 4, 2]; // Classic arpeggio pattern
        this.arpeggioIndex = 0;
        this.melodyNotes = [];
        this.currentNote = 0;
        
        // Persistence flags
        this.hasBeenActivated = false;
        this.shouldPersist = true;
        
        // Auto-initialization on first user interaction
        this.bindFirstInteraction();
        
        // Prevent page unload from stopping audio
        this.bindPageEvents();
    }
    
    bindFirstInteraction() {
        const initOnce = () => {
            if (!this.isInitialized) {
                this.hasBeenActivated = true;
                this.init();
                // Keep listening for interactions to ensure audio stays active
                this.bindContinuousInteraction();
            }
        };
        
        // Multiple event types to catch first interaction
        const events = ['click', 'touchstart', 'keydown', 'mousedown'];
        events.forEach(event => {
            document.addEventListener(event, initOnce, { once: true, passive: true });
        });
    }
    
    bindContinuousInteraction() {
        // Resume audio context if it gets suspended
        const resumeAudio = () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(console.warn);
            }
        };
        
        // Listen for any user interaction to keep audio alive
        const events = ['click', 'touchstart', 'keydown', 'mousedown', 'touchend'];
        events.forEach(event => {
            document.addEventListener(event, resumeAudio, { passive: true });
        });
    }
    
    bindPageEvents() {
        // Prevent audio from stopping on page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.hasBeenActivated && !this.isPlaying) {
                // Restart audio if page becomes visible and audio was previously active
                setTimeout(() => {
                    if (this.isInitialized && this.shouldPersist) {
                        this.start();
                    }
                }, 100);
            }
        });
        
        // Keep audio context alive on focus events
        window.addEventListener('focus', () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(console.warn);
            }
        });
    }
    
    async init() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume context if suspended (mobile browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            console.log('🎵 Audio context state:', this.audioContext.state);
            console.log('🎵 Audio context sample rate:', this.audioContext.sampleRate);
            
            // Create master gain - increased volume for better audibility
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
            this.masterGain.connect(this.audioContext.destination);
            
            // Create reverb
            this.reverb = await this.createReverb();
            this.reverb.connect(this.masterGain);
            
            // Create delay
            this.delay = this.createDelay();
            this.delay.connect(this.reverb);
            
            this.isInitialized = true;
            
            // Test basic audio functionality first
            this.testBasicAudio();
            
            // Test tone to verify audio is working
            this.playTestTone();
            
            this.start();
            
            console.log('🎵 Hollie Audio System initialized');
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }
    
    async createReverb() {
        const convolver = this.audioContext.createConvolver();
        const length = this.audioContext.sampleRate * 1; // Shorter reverb
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - (i / length), 2);
                channelData[i] = (Math.random() * 2 - 1) * decay * 0.05; // Reduced intensity
            }
        }
        
        convolver.buffer = impulse;
        return convolver;
    }
    
    createDelay() {
        const delay = this.audioContext.createDelay(1.0);
        const feedback = this.audioContext.createGain();
        const delayGain = this.audioContext.createGain();
        
        delay.delayTime.setValueAtTime(0.2, this.audioContext.currentTime);
        feedback.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        delayGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(delayGain);
        
        return delayGain;
    }
    
    createPulseWave(freq, dutyCycle = 0.25) {
        if (!this.audioContext) return null;
        
        // Create a square wave using oscillator
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        
        // Simple duty cycle simulation through volume envelope
        const shaper = this.audioContext.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i / 256) * 2 - 1;
            curve[i] = x < (dutyCycle * 2 - 1) ? 1 : -1;
        }
        shaper.curve = curve;
        
        osc.connect(shaper);
        shaper.connect(gain);
        
        return { osc, gain, shaper };
    }
    
    createTriangleWave(freq) {
        if (!this.audioContext) return null;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        
        // Low-pass filter for that classic triangle sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
        filter.Q.setValueAtTime(0.5, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        
        osc.connect(filter);
        filter.connect(gain);
        
        return { osc, gain, filter };
    }
    
    createNoiseChannel() {
        if (!this.audioContext) return null;
        
        // White noise generator
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        noise.loop = true;
        
        // High-pass filter for snare-like sound
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filter.Q.setValueAtTime(2, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        
        noise.connect(filter);
        filter.connect(gain);
        
        return { noise, gain, filter };
    }
    
    createHarmonic(freq, pan = 0, filterFreq = 2000) {
        if (!this.audioContext) return null;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const panner = this.audioContext.createStereoPanner();
        
        // Oscillator setup
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        
        // Filter setup
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, this.audioContext.currentTime);
        filter.Q.setValueAtTime(1, this.audioContext.currentTime);
        
        // Gain setup
        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        
        // Panner setup
        panner.pan.setValueAtTime(pan, this.audioContext.currentTime);
        
        // Connect audio graph
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(this.delay);
        panner.connect(this.reverb);
        // Connect directly to master gain for dry signal
        panner.connect(this.masterGain);
        
        // Store references with gain access
        const harmonicData = { osc, gain, filter, panner };
        this.oscillators.push(osc);
        this.filters.push(filter);
        this.harmonics.push(harmonicData); // Store complete harmonic data
        
        return harmonicData;
    }
    
    start() {
        if (!this.audioContext || this.isPlaying) return;
        
        console.log('🎵 Starting Hollie Audio System...');
          this.isPlaying = true;
        this.currentMeasure = 0;
        this.currentBeat = 0;
        this.currentSection = 0;
        this.sectionMeasure = 0;        this.arpeggioIndex = 0;
        this.currentNote = 0;        this.currentChord = 0;
        this.developmentStage = 0;
        this.lastTempoChange = 0;
        this.lastRestart = 0; // Track restart attempts
        
        // Initialize procedural music system
        this.initializeProceduralSystem();
        
        // Generate initial musical content
        this.generateNewSection();
        
        // Create 8-bit style channels
        this.channels.pulse1 = this.createPulseWave(this.baseFreq * 2, 0.25); // Main melody
        this.channels.pulse2 = this.createPulseWave(this.baseFreq * 1.5, 0.5); // Harmony
        this.channels.triangle = this.createTriangleWave(this.baseFreq); // Bass
        this.channels.noise = this.createNoiseChannel(); // Percussion
        this.channels.arp = this.createPulseWave(this.baseFreq * 3, 0.125); // Arpeggio
        
        console.log('🎵 Channels created:', Object.keys(this.channels).filter(k => this.channels[k]));
        
        // Connect channels to effects AND master gain
        Object.values(this.channels).forEach(channel => {
            if (channel && channel.gain) {
                // Connect to effects
                channel.gain.connect(this.delay);
                channel.gain.connect(this.reverb);
                // Connect directly to master gain for dry signal
                channel.gain.connect(this.masterGain);
            }
        });
        
        console.log('🎵 Channels connected to audio graph');
        
        // Start sound sources
        if (this.channels.pulse1) {
            this.channels.pulse1.osc.start(this.audioContext.currentTime);
            console.log('🎵 Pulse1 started');
        }
        if (this.channels.pulse2) {
            this.channels.pulse2.osc.start(this.audioContext.currentTime);
            console.log('🎵 Pulse2 started');
        }
        if (this.channels.triangle) {
            this.channels.triangle.osc.start(this.audioContext.currentTime);
            console.log('🎵 Triangle started');
        }
        if (this.channels.noise) {
            this.channels.noise.noise.start(this.audioContext.currentTime);
            console.log('🎵 Noise started');
        }
        if (this.channels.arp) {
            this.channels.arp.osc.start(this.audioContext.currentTime);
            console.log('🎵 Arp started');
        }
        
        // Legacy harmonic creation for compatibility
        this.createHarmonic(this.baseFreq, -0.3, 1200);           
        this.createHarmonic(this.baseFreq * 3/2, 0.3, 1800);     
        this.createHarmonic(this.baseFreq * 5/4, 0, 2400);       
        this.createHarmonic(this.baseFreq * 2, -0.1, 800);       
        this.createHarmonic(this.baseFreq * 9/8, 0.2, 1600);     
        
        // Start legacy oscillators
        this.oscillators.forEach(osc => {
            osc.start(this.audioContext.currentTime);
        });
          // Set initial gains for legacy harmonics - increased volume
        this.harmonics.forEach((harmonic, i) => {
            const baseGain = 0.2 + (i * 0.03); // Increased base levels for audibility
            harmonic.gain.gain.setValueAtTime(baseGain, this.audioContext.currentTime);
        });
        
        // Immediate test sound to verify audio works
        this.triggerImmediateSound();
        
        // Begin structured musical evolution
        this.scheduleNextBeat();
        
        console.log('🎵 Audio system started, playing:', this.isPlaying);    }
    
    // ========== INFINITE PROCEDURAL SYSTEM ==========
    
    initializeProceduralSystem() {
        // Create initial musical themes
        this.generateInitialThemes();
        
        // Generate first chord progression
        this.generateChordProgression();
        
        // Generate initial rhythm patterns
        this.generateRhythmPatterns();
        
        console.log('🎵 Procedural system initialized');
        console.log('🎵 Initial themes:', this.musicalThemes.length);
        console.log('🎵 Chord progression:', this.chordProgression);
    }
    
    generateInitialThemes() {
        this.musicalThemes = [];
        
        // Create 3-5 base themes that can be developed
        const themeCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < themeCount; i++) {
            const theme = this.createMusicalTheme();
            this.musicalThemes.push(theme);
        }
        
        // Select first theme
        this.currentTheme = this.musicalThemes[0];
        this.developmentStage = 0;
    }
    
    createMusicalTheme() {
        const currentScale = this.getCurrentScale();
        const length = 4 + Math.floor(Math.random() * 5); // 4-8 note themes
        
        const theme = {
            melody: [],
            rhythm: [],
            harmony: [],
            character: this.generateThemeCharacter(),
            variations: [],
            developmentLevel: 0
        };
        
        // Generate melodic contour
        let currentNote = Math.floor(Math.random() * currentScale.length);
        for (let i = 0; i < length; i++) {
            theme.melody.push(currentNote);
            theme.rhythm.push(this.generateRhythmicValue());
            
            // Melodic movement based on theme character
            const movement = this.getThemeMovement(theme.character);
            currentNote = this.applyMelodicMovement(currentNote, movement, currentScale.length);
        }
        
        // Generate harmonic structure
        theme.harmony = this.generateHarmonicStructure(theme.melody);
        
        return theme;
    }
    
    generateThemeCharacter() {
        const characters = [
            'ascending', 'descending', 'arpeggiated', 'stepwise', 
            'angular', 'flowing', 'rhythmic', 'lyrical',
            'chromatic', 'pentatonic', 'modal', 'blues'
        ];
        
        return characters[Math.floor(Math.random() * characters.length)];
    }
    
    getThemeMovement(character) {
        const movements = {
            'ascending': () => Math.random() > 0.3 ? 1 : -1,
            'descending': () => Math.random() > 0.3 ? -1 : 1,
            'arpeggiated': () => Math.random() > 0.5 ? 2 : -2,
            'stepwise': () => Math.random() > 0.5 ? 1 : -1,
            'angular': () => Math.random() > 0.6 ? (Math.random() > 0.5 ? 3 : -3) : (Math.random() > 0.5 ? 1 : -1),
            'flowing': () => Math.random() > 0.7 ? (Math.random() > 0.5 ? 2 : -2) : (Math.random() > 0.5 ? 1 : -1),
            'rhythmic': () => Math.random() > 0.4 ? 0 : (Math.random() > 0.5 ? 1 : -1),
            'lyrical': () => Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0
        };
        
        return movements[character] || movements['stepwise'];
    }
    
    applyMelodicMovement(currentNote, movementFunc, scaleLength) {
        const movement = movementFunc();
        let newNote = currentNote + movement;
        
        // Keep within scale bounds with wrapping
        if (newNote >= scaleLength) {
            newNote = newNote % scaleLength;
        } else if (newNote < 0) {
            newNote = scaleLength + (newNote % scaleLength);
        }
        
        return newNote;
    }
    
    generateRhythmicValue() {
        const values = [1, 0.5, 0.25, 0.75, 1.5, 2]; // Various note lengths
        const weights = [0.3, 0.25, 0.15, 0.1, 0.1, 0.1]; // Probability weights
        
        const rand = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < values.length; i++) {
            cumulative += weights[i];
            if (rand <= cumulative) {
                return values[i];
            }
        }
        
        return 1; // Default
    }
    
    generateHarmonicStructure(melody) {
        const harmony = [];
        const chordTypes = ['major', 'minor', 'diminished', 'augmented', 'sus2', 'sus4'];
        
        for (let i = 0; i < melody.length; i++) {
            const root = melody[i];
            const chordType = chordTypes[Math.floor(Math.random() * chordTypes.length)];
            harmony.push({ root, type: chordType });
        }
        
        return harmony;
    }
    
    generateChordProgression() {
        const progressionLength = 4 + Math.floor(Math.random() * 5); // 4-8 chords
        const currentScale = this.getCurrentScale();
        this.chordProgression = [];
        
        // Common chord progression patterns in various keys
        const progressionTemplates = [
            [0, 3, 4, 0], // I-IV-V-I
            [0, 5, 3, 4], // I-vi-IV-V
            [0, 4, 5, 3], // I-V-vi-IV
            [5, 3, 0, 4], // vi-IV-I-V
            [0, 2, 3, 4], // I-iii-IV-V
            [0, 6, 3, 4], // I-vii-IV-V (modal)
        ];
        
        const template = progressionTemplates[Math.floor(Math.random() * progressionTemplates.length)];
        
        for (let i = 0; i < progressionLength; i++) {
            const scaleIndex = template[i % template.length];
            const chordQuality = this.determineChordQuality(scaleIndex);
            
            this.chordProgression.push({
                root: scaleIndex,
                quality: chordQuality,
                extensions: this.generateChordExtensions()
            });
        }
        
        console.log('🎵 New chord progression generated:', this.chordProgression);
    }
    
    determineChordQuality(scaleIndex) {
        // Determine chord quality based on mode and scale degree
        const qualities = {
            ionian: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
            dorian: ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'],
            phrygian: ['minor', 'major', 'major', 'minor', 'diminished', 'major', 'minor'],
            lydian: ['major', 'major', 'minor', 'diminished', 'major', 'minor', 'minor'],
            mixolydian: ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'],
            aeolian: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
            locrian: ['diminished', 'major', 'minor', 'minor', 'major', 'major', 'minor']
        };
        
        const modeQualities = qualities[this.currentMode] || qualities.ionian;
        return modeQualities[scaleIndex % modeQualities.length];
    }
    
    generateChordExtensions() {
        const extensions = [];
        
        if (Math.random() > 0.7) extensions.push('7th');
        if (Math.random() > 0.8) extensions.push('9th');
        if (Math.random() > 0.9) extensions.push('11th');
        
        return extensions;
    }
      generateRhythmPatterns() {
        // Generate kick drum pattern - ensure strong 4/4 foundation
        this.rhythmPatterns.kick = [true, false, false, false]; // Classic four-on-the-floor start
        
        // Generate snare pattern - strong backbeats
        this.rhythmPatterns.snare = [false, true, false, true]; // Beats 2 and 4
        
        // Generate hihat pattern - consistent 8th notes with some variation
        this.rhythmPatterns.hihat = [true, true, true, false, true, true, true, false]; // Consistent with breaks
        
        // Generate melody rhythm - balanced with rests
        this.rhythmPatterns.melody = [true, false, true, true, false, true, false, true];
        
        // Generate bass rhythm - emphasize strong beats
        this.rhythmPatterns.bass = [true, false, true, false]; // Strong beats with syncopation
        
        console.log('🎵 Generated balanced 4/4 rhythm patterns');
    }
    
    generateRhythmPattern(divisions, probability, favoredBeats = []) {
        const pattern = [];
        
        for (let i = 0; i < divisions; i++) {
            let chance = probability;
            
            // Increase probability for favored beats
            if (favoredBeats.includes(i)) {
                chance += 0.3;
            }
            
            pattern.push(Math.random() < chance);
        }
        
        return pattern;
    }
    
    generateSectionLength() {
        // Procedurally determine next section length
        const possibleLengths = [2, 4, 6, 8, 12, 16, 32];
        const weights = [0.05, 0.2, 0.15, 0.25, 0.15, 0.15, 0.05];
        
        const rand = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < possibleLengths.length; i++) {
            cumulative += weights[i];
            if (rand <= cumulative) {
                return possibleLengths[i];
            }
        }
        
        return 8; // Default
    }
    
    generateNewSection() {
        console.log(`🎵 Generating new section: ${this.nextSectionLength} measures`);
        
        // Evolve musical elements
        this.evolveMusicalElements();
        
        // Generate new melody based on current theme
        this.generateThemeBasedMelody();
        
        // Update rhythmic patterns
        this.evolveRhythmPatterns();
        
        // Potentially change key or mode
        this.considerMusicalChanges();
        
        // Generate next section length for the future
        this.nextSectionLength = this.generateSectionLength();
    }
    
    evolveMusicalElements() {
        // Develop current theme
        if (Math.random() > 0.3) {
            this.developCurrentTheme();
        }
        
        // Sometimes switch to a different theme
        if (Math.random() > 0.7) {
            this.switchToNewTheme();
        }
        
        // Evolve chord progression
        if (Math.random() > 0.5) {
            this.evolveChordProgression();
        }
    }
    
    developCurrentTheme() {
        if (!this.currentTheme) return;
        
        this.developmentStage++;
        
        // Create variation of current theme
        const variation = this.createThemeVariation(this.currentTheme, this.developmentStage);
        this.currentTheme.variations.push(variation);
        this.currentTheme.developmentLevel = this.developmentStage;
        
        console.log(`🎵 Theme developed to stage ${this.developmentStage}`);
    }
    
    createThemeVariation(theme, stage) {
        const variation = {
            melody: [...theme.melody],
            rhythm: [...theme.rhythm],
            harmony: [...theme.harmony],
            transformations: []
        };
        
        // Apply transformations based on development stage
        const transformations = [
            'inversion', 'retrograde', 'augmentation', 'diminution',
            'sequence', 'fragmentation', 'extension', 'compression'
        ];
        
        const numTransformations = Math.min(stage, 3);
        
        for (let i = 0; i < numTransformations; i++) {
            const transform = transformations[Math.floor(Math.random() * transformations.length)];
            this.applyTransformation(variation, transform);
            variation.transformations.push(transform);
        }
        
        return variation;
    }
    
    applyTransformation(variation, transform) {
        switch (transform) {
            case 'inversion':
                variation.melody = this.invertMelody(variation.melody);
                break;
            case 'retrograde':
                variation.melody.reverse();
                variation.rhythm.reverse();
                break;
            case 'augmentation':
                variation.rhythm = variation.rhythm.map(r => r * 2);
                break;
            case 'diminution':
                variation.rhythm = variation.rhythm.map(r => r * 0.5);
                break;
            case 'sequence':
                variation.melody = this.sequenceMelody(variation.melody);
                break;
            case 'fragmentation':
                variation = this.fragmentTheme(variation);
                break;
            case 'extension':
                variation.melody = this.extendMelody(variation.melody);
                break;
            case 'compression':
                variation.melody = this.compressMelody(variation.melody);
                break;
        }
    }
    
    invertMelody(melody) {
        if (melody.length === 0) return melody;
        
        const center = melody[0];
        return melody.map(note => center - (note - center));
    }
    
    sequenceMelody(melody) {
        const sequenced = [...melody];
        const interval = 1 + Math.floor(Math.random() * 3); // Sequence up by 1-3 steps
        
        for (let i = 0; i < melody.length; i++) {
            sequenced.push(melody[i] + interval);
        }
        
        return sequenced;
    }
    
    fragmentTheme(variation) {
        const fragmentLength = Math.max(1, Math.floor(variation.melody.length / 2));
        variation.melody = variation.melody.slice(0, fragmentLength);
        variation.rhythm = variation.rhythm.slice(0, fragmentLength);
        return variation;
    }
    
    extendMelody(melody) {
        const extension = [];
        const lastNote = melody[melody.length - 1];
        const extensionLength = 2 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < extensionLength; i++) {
            const movement = Math.random() > 0.5 ? 1 : -1;
            extension.push(lastNote + movement * (i + 1));
        }
        
        return [...melody, ...extension];
    }
    
    compressMelody(melody) {
        if (melody.length <= 2) return melody;
        
        const compressed = [];
        for (let i = 0; i < melody.length; i += 2) {
            compressed.push(melody[i]);
        }
        
        return compressed;
    }
    
    switchToNewTheme() {
        const availableThemes = this.musicalThemes.filter(theme => theme !== this.currentTheme);
        
        if (availableThemes.length === 0) {
            // Create a new theme
            const newTheme = this.createMusicalTheme();
            this.musicalThemes.push(newTheme);
            this.currentTheme = newTheme;
        } else {
            this.currentTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
        }
        
        this.developmentStage = 0;
        console.log('🎵 Switched to new theme:', this.currentTheme.character);
    }
    
    evolveChordProgression() {
        // Randomly modify 1-2 chords in the progression
        const numChanges = 1 + Math.floor(Math.random() * 2);
        
        for (let i = 0; i < numChanges; i++) {
            const chordIndex = Math.floor(Math.random() * this.chordProgression.length);
            const currentScale = this.getCurrentScale();
            
            // Change to a related chord
            const originalRoot = this.chordProgression[chordIndex].root;
            const newRoot = this.getRelatedChord(originalRoot, currentScale.length);
            
            this.chordProgression[chordIndex] = {
                root: newRoot,
                quality: this.determineChordQuality(newRoot),
                extensions: this.generateChordExtensions()
            };
        }
        
        console.log('🎵 Chord progression evolved:', this.chordProgression);
    }
    
    getRelatedChord(originalRoot, scaleLength) {
        // Get chords that are harmonically related
        const relationships = [-1, 1, -2, 2, -3, 3]; // Stepwise and third relationships
        const relationship = relationships[Math.floor(Math.random() * relationships.length)];
        
        let newRoot = originalRoot + relationship;
        
        // Keep within scale bounds
        if (newRoot >= scaleLength) {
            newRoot = newRoot % scaleLength;
        } else if (newRoot < 0) {
            newRoot = scaleLength + (newRoot % scaleLength);
        }
        
        return newRoot;
    }
      evolveRhythmPatterns() {
        // Evolve patterns but maintain musical structure
        this.rhythmPatterns.kick = this.evolveKickPattern(this.rhythmPatterns.kick);
        this.rhythmPatterns.snare = this.evolveSnarePattern(this.rhythmPatterns.snare);
        this.rhythmPatterns.hihat = this.evolveHihatPattern(this.rhythmPatterns.hihat);
        this.rhythmPatterns.melody = this.evolveMelodyPattern(this.rhythmPatterns.melody);
        this.rhythmPatterns.bass = this.evolveBassPattern(this.rhythmPatterns.bass);
        
        console.log('🎵 Evolved rhythm patterns while maintaining 4/4 structure');
    }
    
    evolveKickPattern(pattern) {
        // Keep kick strong on beat 1, allow variation on others
        const evolved = [...pattern];
        evolved[0] = true; // Always keep beat 1
        
        // Randomly vary other beats but maintain some pattern
        for (let i = 1; i < evolved.length; i++) {
            if (Math.random() < 0.3) {
                evolved[i] = !evolved[i];
            }
        }
        return evolved;
    }
    
    evolveSnarePattern(pattern) {
        // Keep snare strong on beats 2 and 4
        const evolved = [...pattern];
        evolved[1] = true; // Always keep beat 2
        evolved[3] = true; // Always keep beat 4
        return evolved;
    }
    
    evolveHihatPattern(pattern) {
        // Maintain consistent hihat flow
        const evolved = [...pattern];
        const numChanges = Math.min(2, Math.floor(Math.random() * pattern.length / 2));
        
        for (let i = 0; i < numChanges; i++) {
            const index = Math.floor(Math.random() * pattern.length);
            evolved[index] = !evolved[index];
        }
        
        // Ensure at least half the beats are active
        const activeBeats = evolved.filter(beat => beat).length;
        if (activeBeats < pattern.length / 2) {
            evolved[0] = true;
            evolved[2] = true;
        }
        
        return evolved;
    }
    
    evolveMelodyPattern(pattern) {
        // Keep melody active but allow subtle changes
        const evolved = [...pattern];
        const numChanges = Math.floor(Math.random() * 2) + 1;
        
        for (let i = 0; i < numChanges; i++) {
            const index = Math.floor(Math.random() * pattern.length);
            evolved[index] = !evolved[index];
        }
        
        // Ensure melody doesn't become too sparse
        const activeBeats = evolved.filter(beat => beat).length;
        if (activeBeats < 3) {
            evolved[0] = true;
            evolved[2] = true;
            evolved[4] = true;
        }
        
        return evolved;
    }
    
    evolveBassPattern(pattern) {
        // Keep bass strong and foundational
        const evolved = [...pattern];
        evolved[0] = true; // Always keep beat 1
        
        // Allow some variation on other beats
        for (let i = 1; i < evolved.length; i++) {
            if (Math.random() < 0.25) {
                evolved[i] = !evolved[i];
            }
        }
        return evolved;
    }
    
    considerMusicalChanges() {
        // Consider key changes
        if (Math.random() > 0.85) {
            this.changeKey();
        }
        
        // Consider mode changes
        if (Math.random() > 0.9) {
            this.changeMode();
        }
        
        // Consider tempo changes
        if (Math.random() > 0.95) {
            this.changeTempo();
        }
        
        // Consider time signature changes
        if (Math.random() > 0.98) {
            this.changeTimeSignature();
        }
    }
    
    changeKey() {
        const keyChanges = [-2, -1, 1, 2, 3, -3]; // Common key relationships
        const change = keyChanges[Math.floor(Math.random() * keyChanges.length)];
        
        this.currentKey += change;
        this.baseFreq = 110 * Math.pow(2, this.currentKey / 12); // Adjust base frequency
        
        console.log(`🎵 Key changed by ${change} semitones, new base frequency: ${this.baseFreq.toFixed(2)}Hz`);
    }
    
    changeMode() {
        const modes = Object.keys(this.modes);
        const newMode = modes[Math.floor(Math.random() * modes.length)];
        
        if (newMode !== this.currentMode) {
            this.currentMode = newMode;
            console.log(`🎵 Mode changed to: ${this.currentMode}`);
            
            // Regenerate chord progression for new mode
            this.generateChordProgression();
        }
    }
      changeTempo() {
        // Generate new target tempo within 72-111 BPM range
        this.targetTempo = this.minTempo + Math.random() * (this.maxTempo - this.minTempo);
        this.lastTempoChange = Date.now();
        
        console.log(`🎵 Target tempo set to: ${this.targetTempo.toFixed(1)} BPM`);
    }
      // Time signature is fixed at 4/4 - this method is deprecated but kept for compatibility
    changeTimeSignature() {
        // No-op: Time signature is now fixed at 4/4
        console.log(`🎵 Time signature remains at 4/4 (standardized)`);
    }
    
    generateThemeBasedMelody() {
        this.melodyNotes = [];
        
        if (!this.currentTheme) {
            // Fallback to simple melody generation
            this.generateMelody();
            return;
        }
        
        // Use current theme and its variations
        const themeToUse = this.currentTheme.variations.length > 0 ? 
            this.currentTheme.variations[this.currentTheme.variations.length - 1] : 
            this.currentTheme;
        
        const currentScale = this.getCurrentScale();
        const measuresInSection = this.nextSectionLength;
          // Repeat and develop the theme across the section
        for (let measure = 0; measure < measuresInSection; measure++) {
            for (let beat = 0; beat < 4; beat++) { // Fixed 4/4 time signature
                const themeIndex = (measure * 4 + beat) % themeToUse.melody.length;
                const scaleIndex = Math.max(0, Math.min(currentScale.length - 1, themeToUse.melody[themeIndex]));
                this.melodyNotes.push(currentScale[scaleIndex]);
            }
        }
        
        console.log(`🎵 Generated theme-based melody with ${this.melodyNotes.length} notes`);
    }
    
    // ========== END INFINITE PROCEDURAL SYSTEM ==========
      generateMelody() {
        // Legacy method - now delegates to theme-based generation
        if (this.currentTheme) {
            this.generateThemeBasedMelody();
        } else {
            // Fallback simple generation
            this.melodyNotes = [];
            const currentScale = this.getCurrentScale();
            
            for (let i = 0; i < 16; i++) {
                const noteIndex = Math.floor(Math.random() * currentScale.length);
                this.melodyNotes.push(currentScale[noteIndex]);
            }
        }
    }
    
    generateComplexMelody(scale) {
        // Enhanced complex melody generation
        const pattern = [];
        let lastNote = 0;
        
        for (let i = 0; i < 16; i++) {
            // More sophisticated melodic movement
            const movement = this.getComplexMelodicMovement(i, lastNote, scale.length);
            let nextNote = lastNote + movement;
            
            // Keep within bounds with more musical wrapping
            nextNote = this.constrainToScale(nextNote, scale.length);
            pattern.push(nextNote);
            lastNote = nextNote;
        }
        return pattern;
    }
    
    getComplexMelodicMovement(position, lastNote, scaleLength) {
        // Create more musical melodic movement
        const phrase = Math.floor(position / 4); // Which 4-note phrase
        const positionInPhrase = position % 4;
        
        // Different movement patterns for different phrase positions
        const movementTypes = {
            0: () => Math.random() > 0.4 ? this.getStepwiseMovement() : this.getLeapMovement(),
            1: () => Math.random() > 0.6 ? this.getStepwiseMovement() : this.getSequentialMovement(phrase),
            2: () => Math.random() > 0.5 ? this.getContrastingMovement(lastNote, scaleLength) : this.getStepwiseMovement(),
            3: () => this.getCadentialMovement(lastNote, scaleLength)
        };
        
        return movementTypes[positionInPhrase]();
    }
    
    getStepwiseMovement() {
        return Math.random() > 0.5 ? 1 : -1;
    }
    
    getLeapMovement() {
        const leaps = [-4, -3, -2, 2, 3, 4, 5];
        return leaps[Math.floor(Math.random() * leaps.length)];
    }
    
    getSequentialMovement(phrase) {
        return phrase % 2 === 0 ? 1 : -1; // Alternating direction
    }
    
    getContrastingMovement(lastNote, scaleLength) {
        // Move away from extremes, toward extremes from middle
        const middle = Math.floor(scaleLength / 2);
        if (lastNote < middle) {
            return Math.random() > 0.3 ? 2 : 1; // Tend upward
        } else {
            return Math.random() > 0.3 ? -2 : -1; // Tend downward
        }
    }
    
    getCadentialMovement(lastNote, scaleLength) {
        // Tendency toward resolution
        const target = Math.floor(scaleLength / 2); // Center of scale
        return lastNote > target ? -1 : 1;
    }
    
    constrainToScale(note, scaleLength) {
        while (note >= scaleLength) {
            note -= scaleLength;
        }
        while (note < 0) {
            note += scaleLength;
        }
        return note;
    }
      getCurrentScale() {
        return this.modes[this.currentMode] || this.scale;
    }
    
    scheduleNextBeat() {
        if (!this.isPlaying || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const nextBeatTime = now + 0.05; // Small scheduling ahead
        
        // Process current beat immediately
        this.processBeat(nextBeatTime);        // Advance timing
        this.currentBeat++;
        if (this.currentBeat >= 4) { // Fixed 4/4 time signature
            this.currentBeat = 0;
            this.currentMeasure++;
            this.sectionMeasure++;
            this.processMeasure();
        }
        
        // Schedule next beat
        this.evolutionTimer = setTimeout(() => this.scheduleNextBeat(), this.beatDuration * 1000);
    }    processBeat(beatTime) {
        // Update tempo transitions
        this.updateTempo(beatTime);
        
        // Beat-based musical events (fixed 4/4 time)
        const beatInMeasure = this.currentBeat;
        const isDownbeat = beatInMeasure === 0;
        const isUpbeat = beatInMeasure === 2; // Beat 3 in 4/4 time
        const totalBeats = this.currentMeasure * 4 + this.currentBeat;
        
        // 8-bit Channel Updates with procedural rhythm
        this.update8BitChannelsWithRhythm(beatTime, isDownbeat, isUpbeat, totalBeats);
        
        // Legacy harmonic updates for ambient layer
        this.updateLegacyHarmonics(beatTime, isDownbeat, isUpbeat, totalBeats);
        
        this.phase += 0.1;
    }
    
    update8BitChannelsWithRhythm(beatTime, isDownbeat, isUpbeat, totalBeats) {
        const currentScale = this.getCurrentScale();
        const currentChord = this.chordProgression[this.currentChord % this.chordProgression.length];
        
        // Validate inputs
        if (!currentScale || currentScale.length === 0 || !isFinite(this.baseFreq) || this.baseFreq <= 0) {
            return;
        }
        
        // Use rhythm patterns for more sophisticated timing
        const beatInPattern = totalBeats % 8;
        const measureBeat = this.currentBeat;
        
        // Pulse 1 - Main Melody (uses melody rhythm pattern)
        if (this.channels.pulse1 && this.melodyNotes.length > 0) {
            const usePattern = this.rhythmPatterns.melody[beatInPattern % this.rhythmPatterns.melody.length];
            
            if (usePattern) {
                const noteIndex = totalBeats % this.melodyNotes.length;
                const freq = this.baseFreq * 2 * this.melodyNotes[noteIndex];
                  if (freq && isFinite(freq) && freq > 0) {
                    this.channels.pulse1.osc.frequency.exponentialRampToValueAtTime(freq, beatTime);
                    
                    // Dynamic volume based on theme character - increased base volume
                    let gain = 0.25;
                    if (this.currentTheme) {
                        gain *= this.getThemeVolumeMultiplier(this.currentTheme.character);
                    }
                    
                    this.channels.pulse1.gain.gain.setValueAtTime(gain, beatTime);
                    this.channels.pulse1.gain.gain.exponentialRampToValueAtTime(gain * 0.4, beatTime + this.beatDuration * 0.8);
                }
            }
        }
        
        // Pulse 2 - Harmony (based on current chord)
        if (this.channels.pulse2 && currentChord) {
            const usePattern = this.rhythmPatterns.melody[(beatInPattern + 2) % this.rhythmPatterns.melody.length];
              if (usePattern && !isDownbeat) {
                const harmonyNote = this.getChordTone(currentChord, 1); // Third of chord
                const freq = this.baseFreq * 1.5 * harmonyNote;
                
                if (freq && isFinite(freq) && freq > 0) {
                    this.channels.pulse2.osc.frequency.exponentialRampToValueAtTime(freq, beatTime);
                    
                    const gain = isUpbeat ? 0.16 : 0.10;
                    this.channels.pulse2.gain.gain.setValueAtTime(gain, beatTime);
                    this.channels.pulse2.gain.gain.exponentialRampToValueAtTime(gain * 0.3, beatTime + this.beatDuration * 0.6);
                }
            }
        }
          // Triangle - Bass (follows chord progression)
        if (this.channels.triangle && currentChord) {
            const usePattern = this.rhythmPatterns.bass[measureBeat % this.rhythmPatterns.bass.length];
            
            if (usePattern) {
                const bassNote = this.getChordTone(currentChord, 0); // Root of chord
                const freq = this.baseFreq * bassNote;
                
                if (freq && isFinite(freq) && freq > 0) {
                    this.channels.triangle.osc.frequency.exponentialRampToValueAtTime(freq, beatTime);
                    
                    const gain = isDownbeat ? 0.35 : 0.25;
                    this.channels.triangle.gain.gain.setValueAtTime(gain, beatTime);
                    this.channels.triangle.gain.gain.exponentialRampToValueAtTime(gain * 0.2, beatTime + this.beatDuration);
                }
            }
        }
        
        // Noise - Percussion (uses kick and snare patterns)
        if (this.channels.noise) {
            const useKick = this.rhythmPatterns.kick[measureBeat % this.rhythmPatterns.kick.length];
            const useSnare = this.rhythmPatterns.snare[measureBeat % this.rhythmPatterns.snare.length];
              if (useKick || useSnare) {
                const gain = useKick ? 0.12 : 0.08;
                this.channels.noise.gain.gain.setValueAtTime(gain, beatTime);
                this.channels.noise.gain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.1);
                
                // Different filter settings for kick vs snare
                const cutoff = useKick ? 200 : 4000;
                this.channels.noise.filter.frequency.setValueAtTime(cutoff, beatTime);
            }
        }
        
        // Arpeggio - Arpeggiated chord tones
        if (this.channels.arp && currentChord) {
            const usePattern = this.rhythmPatterns.hihat[beatInPattern % this.rhythmPatterns.hihat.length];
            
            if (usePattern) {
                const arpTone = this.getChordTone(currentChord, this.arpeggioIndex % 4);
                const freq = this.baseFreq * 3 * arpTone;
                  if (freq && isFinite(freq) && freq > 0) {
                    this.channels.arp.osc.frequency.exponentialRampToValueAtTime(freq, beatTime);
                    
                    const gain = 0.10;
                    this.channels.arp.gain.gain.setValueAtTime(gain, beatTime);
                    this.channels.arp.gain.gain.exponentialRampToValueAtTime(gain * 0.2, beatTime + this.beatDuration * 0.5);
                }
                
                this.arpeggioIndex++;
            }
        }
        
        // Advance chord progression
        if (isDownbeat && this.currentMeasure % 2 === 0) {
            this.currentChord = (this.currentChord + 1) % this.chordProgression.length;
        }
    }
    
    getChordTone(chord, index) {
        const currentScale = this.getCurrentScale();
        const root = currentScale[chord.root % currentScale.length];
        
        // Generate chord tones based on chord quality
        const intervals = this.getChordIntervals(chord.quality);
        const toneIndex = index % intervals.length;
        
        return root * intervals[toneIndex];
    }
    
    getChordIntervals(quality) {
        const intervals = {
            'major': [1, 5/4, 3/2, 2],
            'minor': [1, 6/5, 3/2, 2],
            'diminished': [1, 6/5, 64/45, 2],
            'augmented': [1, 5/4, 8/5, 2],
            'sus2': [1, 9/8, 3/2, 2],
            'sus4': [1, 4/3, 3/2, 2]
        };
        
        return intervals[quality] || intervals['major'];
    }
      getThemeVolumeMultiplier(character) {
        const multipliers = {
            'ascending': 1.1,
            'descending': 1.0,  // Increased from 0.9
            'arpeggiated': 1.0,
            'stepwise': 1.0,    // Increased from 0.95
            'angular': 1.2,
            'flowing': 1.0,     // Increased from 0.85
            'rhythmic': 1.3,
            'lyrical': 1.0,     // Increased from 0.8
            'chromatic': 1.1,
            'pentatonic': 1.0,  // Increased from 0.9
            'modal': 1.0,
            'blues': 1.15
        };
        
        return multipliers[character] || 1.0;
    }
    
    updateLegacyHarmonics(beatTime, isDownbeat, isUpbeat, totalBeats) {
        // Legacy harmonic updates for ambient layer
        this.oscillators.forEach((osc, i) => {
            const harmonicGain = this.getHarmonicGain(i);
            if (harmonicGain && harmonicGain.gain) {
                let targetGain = 0.005; // Reduced volume for ambient layer
                
                if (isDownbeat) {
                    targetGain = 0.01 + (i === 0 ? 0.005 : 0);
                } else if (isUpbeat) {
                    targetGain = 0.008 + (i === 1 ? 0.002 : 0);
                } else {
                    targetGain = 0.006 + Math.sin(this.phase + i) * 0.002;
                }
                
                harmonicGain.gain.exponentialRampToValueAtTime(
                    Math.max(targetGain, 0.001), 
                    beatTime + 0.1
                );
            }
        });
        
        // Filter movement on beats
        this.filters.forEach((filter, i) => {
            if (filter.frequency) {
                const baseCutoff = 800 + i * 200;
                const beatModulation = isDownbeat ? 200 : (isUpbeat ? 100 : 0);
                const targetCutoff = baseCutoff + beatModulation + Math.sin(this.phase * 0.5 + i) * 300;
                
                filter.frequency.exponentialRampToValueAtTime(
                    Math.max(targetCutoff, 100), 
                    beatTime + 0.2
                );
            }
        });
    }
    
    update8BitChannels(beatTime, isDownbeat, isUpbeat, totalBeats) {
        const currentScale = this.getCurrentScale();
        
        // Validate inputs
        if (!currentScale || currentScale.length === 0 || !isFinite(this.baseFreq) || this.baseFreq <= 0) {
            return;
        }
        
        // Pulse 1 - Main Melody
        if (this.channels.pulse1 && this.melodyNotes.length > 0) {
            const noteIndex = totalBeats % this.melodyNotes.length;
            const freq = this.baseFreq * 2 * this.melodyNotes[noteIndex];
            
            // Check if frequency is valid before using it
            if (freq && isFinite(freq) && freq > 0) {
                this.channels.pulse1.osc.frequency.exponentialRampToValueAtTime(freq, beatTime);
                
                // Note envelope - increased volume for audibility
                const gain = isDownbeat ? 0.15 : (isUpbeat ? 0.12 : 0.08);
                this.channels.pulse1.gain.gain.setValueAtTime(gain, beatTime);
                this.channels.pulse1.gain.gain.exponentialRampToValueAtTime(gain * 0.3, beatTime + this.beatDuration * 0.8);
            }
        }
        
        // Pulse 2 - Harmony (plays on off-beats)
        if (this.channels.pulse2 && !isDownbeat) {
            const harmonyNote = currentScale[(totalBeats + 2) % currentScale.length];
            const freq = this.baseFreq * 1.5 * harmonyNote;
            
            // Check if frequency is valid before using it
            if (freq && isFinite(freq) && freq > 0) {
                this.channels.pulse2.osc.frequency.exponentialRampToValueAtTime(freq, beatTime);
                
                const gain = isUpbeat ? 0.08 : 0.05;
                this.channels.pulse2.gain.gain.setValueAtTime(gain, beatTime);
                this.channels.pulse2.gain.gain.exponentialRampToValueAtTime(gain * 0.2, beatTime + this.beatDuration * 0.6);
            }
        }
        
        // Triangle - Bass (plays on downbeats and beat 3)
        if (this.channels.triangle && (isDownbeat || isUpbeat)) {
            const bassNote = currentScale[0]; // Root note
            const freq = this.baseFreq * bassNote;
            
            // Check if frequency is valid before using it
            if (freq && isFinite(freq) && freq > 0) {
                this.channels.triangle.osc.frequency.exponentialRampToValueAtTime(freq, beatTime);
                
                const gain = isDownbeat ? 0.2 : 0.15;
                this.channels.triangle.gain.gain.setValueAtTime(gain, beatTime);
                this.channels.triangle.gain.gain.exponentialRampToValueAtTime(gain * 0.1, beatTime + this.beatDuration);
            }
        }
        
        // Noise - Percussion (kick on downbeat, snare on upbeat)
        if (this.channels.noise) {
            if (isDownbeat || isUpbeat) {
                const gain = isDownbeat ? 0.06 : 0.04;
                this.channels.noise.gain.gain.setValueAtTime(gain, beatTime);
                this.channels.noise.gain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.1);
                
                // Different filter settings for kick vs snare
                const cutoff = isDownbeat ? 200 : 4000;
                this.channels.noise.filter.frequency.setValueAtTime(cutoff, beatTime);
            }
        }
        
        // Arpeggio - Fast arpeggiated notes (16th note patterns)
        if (this.channels.arp && this.currentBeat % 2 === 0) { // Every other beat
            const arpIndex = this.arpeggioIndex % this.arpeggioPattern.length;
            const scaleIndex = this.arpeggioPattern[arpIndex] % currentScale.length; // Ensure within bounds
            const freq = this.baseFreq * 3 * currentScale[scaleIndex];
              // Check if frequency is valid before using it
            if (freq && isFinite(freq) && freq > 0) {
                this.channels.arp.osc.frequency.exponentialRampToValueAtTime(freq, beatTime);
                this.channels.arp.gain.gain.setValueAtTime(0.08, beatTime);
                this.channels.arp.gain.gain.exponentialRampToValueAtTime(0.01, beatTime + this.beatDuration * 0.25);
            }
            
            this.arpeggioIndex++;
        }
    }
    
    processMeasure() {
        // Check if we need to move to next section (infinite system)
        if (this.sectionMeasure >= this.nextSectionLength) {
            this.currentSection++;
            this.sectionMeasure = 0;
            this.processSection();
        }
        
        // Measure-based changes
        const measureInSection = this.sectionMeasure;
        this.processMeasureChanges(measureInSection);
    }
    
    processSection() {
        const now = this.audioContext.currentTime;
        
        console.log(`🎵 New infinite section ${this.currentSection}: ${this.nextSectionLength} measures`);
        
        // Generate completely new section
        this.generateNewSection();
          // Update arpeggio pattern based on section length
        switch (this.nextSectionLength) {
            case 4:
                this.arpeggioPattern = [0, 2, 4, 2]; // Simple triad
                break;
            case 8:
                this.arpeggioPattern = [0, 2, 4, 1, 3, 2]; // Extended pattern (removed 6)
                break;
            case 16:
                this.arpeggioPattern = [0, 2, 4, 2, 1, 3, 4, 3]; // Complex pattern
                break;
            default:
                this.arpeggioPattern = [0, 2, 4, 2]; // Default simple pattern
                break;
        }
        
        // Legacy harmonic changes for ambient layer
        this.oscillators.forEach((osc, i) => {
            if (osc.frequency) {
                let scaleIndex;
                  switch (this.nextSectionLength) {
                    case 4: // Short phrase - stay close to root
                        scaleIndex = [0, 4, 2, 0, 1][i] || 0;
                        scaleIndex = scaleIndex % this.scale.length; // Ensure within bounds
                        break;
                    case 8: // Medium phrase - explore more
                        scaleIndex = [0, 2, 4, 0, 1][i] || 0; // Changed 6 to 1
                        scaleIndex = scaleIndex % this.scale.length; // Ensure within bounds
                        break;
                    case 16: // Long phrase - full exploration
                        scaleIndex = Math.floor(Math.sin(this.phase + i) * 3.5 + 3.5) % this.scale.length;
                        break;
                    default:
                        scaleIndex = i % this.scale.length;
                }
                
                const targetFreq = this.baseFreq * this.scale[scaleIndex] * (i === 3 ? 2 : 1);
                
                // Check if frequency is valid before using it
                if (targetFreq && isFinite(targetFreq) && targetFreq > 0) {
                    osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 2);
                }
            }
        });        // Master volume changes based on section length - maintain audible levels
        const volumeMultiplier = this.nextSectionLength === 16 ? 1.2 : (this.nextSectionLength === 8 ? 1.0 : 0.9);
        const targetVolume = 0.6 * volumeMultiplier; // Keep master volume high
        this.masterGain.gain.exponentialRampToValueAtTime(
            Math.max(targetVolume, 0.5), 
            now + 1
        );
    }
    
    processMeasureChanges(measureInSection) {
        const now = this.audioContext.currentTime;
        
        // Subtle changes every measure
        this.oscillators.forEach((osc, i) => {
            if (osc.frequency && measureInSection % 2 === 0) {
                // Every other measure, slight frequency variation
                const currentScale = this.getCurrentScaleIndex(i);
                const variation = Math.sin(measureInSection * 0.5 + i) * 0.02 + 1;
                const targetFreq = this.baseFreq * this.scale[currentScale] * variation * (i === 3 ? 2 : 1);
                
                // Check if frequency is valid before using it
                if (targetFreq && isFinite(targetFreq) && targetFreq > 0) {
                    osc.frequency.exponentialRampToValueAtTime(targetFreq, now + this.measureDuration);
                }
            }
        });
    }
      getCurrentScaleIndex(harmonicIndex) {
        const sectionLength = this.nextSectionLength;
        const currentScale = this.getCurrentScale();
        
        // Dynamic scale index based on current theme and development
        if (this.currentTheme && this.currentTheme.harmony.length > 0) {
            const harmonyIndex = harmonicIndex % this.currentTheme.harmony.length;
            return this.currentTheme.harmony[harmonyIndex].root % currentScale.length;
        }
        
        // Fallback patterns based on section length
        switch (true) {
            case sectionLength <= 4:
                return [0, 4, 2, 0, 1][harmonicIndex] || 0;
            case sectionLength <= 8:
                return [0, 2, 4, 0, 6][harmonicIndex] || 0;            case sectionLength >= 16:
                return Math.floor(Math.sin(this.phase + harmonicIndex) * 3.5 + 3.5) % currentScale.length;
            default:
                return harmonicIndex % currentScale.length;
        }
    }
    
    getHarmonicGain(index) {
        // Helper to get gain node from stored harmonic data
        if (index < this.harmonics.length) {
            return this.harmonics[index].gain;
        }
        return null;
    }
    
    evolve() {
        // Legacy method - now just calls the new structured system
        if (!this.isPlaying) {
            this.scheduleNextBeat();
        }
    }
    
    setVolume(volume) {
        if (this.masterGain) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.exponentialRampToValueAtTime(
                Math.max(volume * 0.1, 0.001), 
                now + 0.1
            );
        }
    }
    
    stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.shouldPersist = false; // User manually stopped
        
        // Clear evolution timer
        if (this.evolutionTimer) {
            clearTimeout(this.evolutionTimer);
            this.evolutionTimer = null;
        }
        
        // Stop 8-bit channels
        Object.values(this.channels).forEach(channel => {
            if (channel) {
                try {
                    if (channel.osc) {
                        channel.osc.stop(this.audioContext.currentTime + 0.1);
                    }
                    if (channel.noise) {
                        channel.noise.stop(this.audioContext.currentTime + 0.1);
                    }
                } catch (e) {
                    // Source may already be stopped
                }
            }
        });
        
        // Reset channels
        this.channels = {
            pulse1: null,
            pulse2: null,
            triangle: null,
            noise: null,
            arp: null
        };
        
        // Stop legacy oscillators
        this.oscillators.forEach(osc => {
            try {
                osc.stop(this.audioContext.currentTime + 1);
            } catch (e) {
                // Oscillator may already be stopped
            }
        });
        
        this.oscillators = [];
        this.filters = [];
        this.harmonics = []; // Clear harmonic data as well
        this.melodyNotes = [];
    }    // Restart audio (used internally for persistence)
    restart() {
        if (!this.isInitialized) return;
        
        // Prevent too frequent restart attempts
        const now = Date.now();
        if (this.lastRestart && (now - this.lastRestart) < 500) {
            return; // Skip if less than 500ms since last restart
        }
        this.lastRestart = now;
        
        // Resume audio context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(console.warn);
        }
          // Restore master volume if it was lowered
        if (this.masterGain && this.masterGain.gain.value < 0.5) {
            this.masterGain.gain.exponentialRampToValueAtTime(0.6, this.audioContext.currentTime + 0.1);
        }
        
        // Only restart if actually stopped and should persist
        if (!this.isPlaying && this.shouldPersist) {
            this.start();
        }
    }
    
    // Public interface
    toggle() {
        if (this.isPlaying) {
            this.stop();
        } else if (this.isInitialized) {
            this.shouldPersist = true; // User manually started
            this.start();
        }
    }
      getState() {
        return {
            initialized: this.isInitialized,
            playing: this.isPlaying,
            phase: this.phase,
            activated: this.hasBeenActivated,
            persistent: this.shouldPersist,
            currentMeasure: this.currentMeasure,
            currentBeat: this.currentBeat,
            currentSection: this.currentSection,
            sectionMeasure: this.sectionMeasure,
            nextSectionLength: this.nextSectionLength,
            tempo: this.tempo,
            timeSignature: this.timeSignature,
            currentMode: this.currentMode,
            currentKey: this.currentKey,
            currentTheme: this.currentTheme ? this.currentTheme.character : null,
            developmentStage: this.developmentStage,
            chordProgression: this.chordProgression,
            currentChord: this.currentChord,
            musicalThemes: this.musicalThemes,
            rhythmPatterns: Object.keys(this.rhythmPatterns)
        };
    }
    
    // Debug function to test basic audio functionality
    testBasicAudio() {
        if (!this.audioContext) {
            console.log('🎵 No audio context available');
            return;
        }
        
        console.log('🎵 Testing basic audio connection...');
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 1);
        
        console.log('🎵 Basic audio test triggered - should hear 880Hz tone');
    }
    
    playTestTone() {
        if (!this.audioContext) return;
        
        // Simple test tone to verify audio is working - increased volume
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.5);
        
        console.log('🎵 Test tone played');
    }
    
    triggerImmediateSound() {
        const now = this.audioContext.currentTime;
        
        // Trigger some immediate sound to test the audio chain - increased volumes
        if (this.channels.pulse1) {
            this.channels.pulse1.gain.gain.setValueAtTime(0.3, now);
            this.channels.pulse1.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        }
        
        if (this.channels.triangle) {
            this.channels.triangle.gain.gain.setValueAtTime(0.25, now + 0.1);
            this.channels.triangle.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        }
        
        console.log('🎵 Immediate sound triggered');
    }
    
    // ========== PROCEDURAL TEMPO SYSTEM ==========
    
    updateTempo(currentTime) {
        // Gradually transition to target tempo
        if (Math.abs(this.tempo - this.targetTempo) > 0.1) {
            const tempoDirection = this.targetTempo > this.tempo ? 1 : -1;
            this.tempo += tempoDirection * this.tempoTransitionSpeed;
            
            // Update beat duration
            this.beatDuration = 60 / this.tempo;
            this.measureDuration = this.beatDuration * 4; // Always 4/4
            
            console.log(`🎵 Tempo transitioning: ${this.tempo.toFixed(1)} → ${this.targetTempo} BPM`);
        }
    }
    
    generateNewTempo() {
        // Generate a new target tempo within the 72-111 BPM range
        // Use musical tempo relationships for smooth transitions
        const currentTempo = this.targetTempo;
        const tempoOptions = this.getMusicalTempoOptions(currentTempo);
        
        this.targetTempo = tempoOptions[Math.floor(Math.random() * tempoOptions.length)];
        this.lastTempoChange = this.currentMeasure;
        
        console.log(`🎵 New target tempo: ${this.targetTempo} BPM (from ${currentTempo})`);
    }
    
    getMusicalTempoOptions(currentTempo) {
        // Generate musically related tempo options
        const options = [];
        
        // Small changes (±5-10 BPM)
        options.push(this.constrainTempo(currentTempo + 5));
        options.push(this.constrainTempo(currentTempo + 8));
        options.push(this.constrainTempo(currentTempo - 5));
        options.push(this.constrainTempo(currentTempo - 8));
        
        // Medium changes (±12-20 BPM)
        options.push(this.constrainTempo(currentTempo + 12));
        options.push(this.constrainTempo(currentTempo + 16));
        options.push(this.constrainTempo(currentTempo - 12));
        options.push(this.constrainTempo(currentTempo - 16));
        
        // Larger changes (±25-35 BPM) - less frequent
        if (Math.random() > 0.7) {
            options.push(this.constrainTempo(currentTempo + 25));
            options.push(this.constrainTempo(currentTempo - 25));
        }
        
        // Musical tempo markings as targets
        const musicalTempos = [72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 111];
        options.push(...musicalTempos.filter(tempo => Math.abs(tempo - currentTempo) >= 8));
        
        // Remove duplicates and return
        return [...new Set(options)];
    }
    
    constrainTempo(tempo) {
        return Math.max(this.minTempo, Math.min(this.maxTempo, Math.round(tempo)));
    }
    
    shouldChangeTempoNow() {
        // Change tempo every 8-32 measures, with some randomness
        const measuresSinceLastChange = this.currentMeasure - this.lastTempoChange;
        const minMeasures = 8;
        const maxMeasures = 32;
        
        if (measuresSinceLastChange < minMeasures) return false;
        if (measuresSinceLastChange >= maxMeasures) return true;
        
        // Probabilistic change between min and max
        const probability = (measuresSinceLastChange - minMeasures) / (maxMeasures - minMeasures);
        return Math.random() < probability * 0.1; // 10% max chance per measure
    }
    
    getTempoBasedCharacter() {
        // Return musical character based on current tempo range
        if (this.tempo <= 80) return 'contemplative';
        if (this.tempo <= 90) return 'relaxed';
        if (this.tempo <= 100) return 'moderate';
        if (this.tempo <= 108) return 'energetic';
        return 'driving';
    }
    
    // ========== END PROCEDURAL TEMPO SYSTEM ==========
}

// Global instance - auto-initializes on first interaction
const HollieSound = new HollieAudio();

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HollieAudio;
}

// Global access
window.HollieSound = HollieSound;

// Enhanced debug functions for infinite system
window.testHollieAudio = function() {
    console.log('🎵 Manual audio test...');
    if (HollieSound.audioContext) {
        HollieSound.testBasicAudio();
        setTimeout(() => {
            HollieSound.triggerImmediateSound();
        }, 1000);
    } else {
        console.log('🎵 HollieSound not initialized');
    }
};

window.debugHollieInfinite = function() {
    const state = HollieSound.getState();
    console.log('🎵 === HOLLIE INFINITE AUDIO DEBUG ===');
    console.log('🎵 Current Section:', state.currentSection);
    console.log('🎵 Section Progress:', `${state.sectionMeasure}/${state.nextSectionLength} measures`);
    console.log('🎵 Current Theme:', state.currentTheme, '(stage', state.developmentStage + ')');
    console.log('🎵 Mode:', state.currentMode);
    console.log('🎵 Key Offset:', state.currentKey, 'semitones');
    console.log('🎵 Time Signature:', `${state.timeSignature[0]}/${state.timeSignature[1]}`);
    console.log('🎵 Tempo:', state.tempo, 'BPM');
    console.log('🎵 Chord Progression:', state.chordProgression);
    console.log('🎵 Current Chord:', state.currentChord);
    console.log('🎵 Musical Themes:', state.musicalThemes);
    console.log('🎵 Rhythm Patterns:', state.rhythmPatterns);
    console.log('🎵 === END DEBUG ===');
    
    return state;
};

window.forceHollieEvolution = function() {
    if (HollieSound.isPlaying) {
        console.log('🎵 Forcing musical evolution...');
        HollieSound.generateNewSection();
        console.log('🎵 Evolution complete!');
        return HollieSound.getState();
    } else {
        console.log('🎵 Hollie audio not currently playing');
    }
};

window.changeHollieMode = function(modeName) {
    if (HollieSound.modes[modeName]) {
        HollieSound.currentMode = modeName;
        HollieSound.generateChordProgression();
        HollieSound.generateThemeBasedMelody();
        console.log(`🎵 Changed to ${modeName} mode`);
        return HollieSound.getState();
    } else {
        console.log('🎵 Available modes:', Object.keys(HollieSound.modes));
    }
};
