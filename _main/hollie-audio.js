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
        this.tempo = 140; // Faster, more chiptune-like
        this.beatDuration = 60 / this.tempo; // seconds per beat
        this.measureDuration = this.beatDuration * 4; // 4/4 time
        this.phase = 0;
        this.harmonics = [];
        this.currentMeasure = 0;
        this.currentBeat = 0;
        this.measureStructure = [4, 4, 8, 16]; // Measures in each section
        this.currentSection = 0;
        this.sectionMeasure = 0;
        
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
        this.sectionMeasure = 0;
        this.arpeggioIndex = 0;
        this.currentNote = 0;
        
        // Generate melody sequence
        this.generateMelody();
        
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
            const baseGain = 0.1 + (i * 0.02); // Increased base levels for audibility
            harmonic.gain.gain.setValueAtTime(baseGain, this.audioContext.currentTime);
        });
        
        // Immediate test sound to verify audio works
        this.triggerImmediateSound();
        
        // Begin structured musical evolution
        this.scheduleNextBeat();
        
        console.log('🎵 Audio system started, playing:', this.isPlaying);
    }
    
    generateMelody() {
        // Generate 8-bit style melody patterns
        this.melodyNotes = [];
        const currentScale = this.getCurrentScale();
        
        // Create different melody patterns based on section
        const patterns = {
            4: [0, 2, 1, 0], // Simple ascending/descending
            8: [0, 2, 4, 2, 1, 3, 2, 0], // More complex phrase
            16: this.generateComplexMelody(currentScale) // Procedural melody
        };
        
        const sectionLength = this.measureStructure[this.currentSection];
        const pattern = patterns[sectionLength] || patterns[4];
        
        // Extend pattern to fill measures
        for (let measure = 0; measure < sectionLength; measure++) {
            for (let beat = 0; beat < 4; beat++) {
                const noteIndex = (measure * 4 + beat) % pattern.length;
                this.melodyNotes.push(currentScale[pattern[noteIndex]]);
            }
        }
    }
    
    generateComplexMelody(scale) {
        const pattern = [];
        for (let i = 0; i < 16; i++) {
            // Weighted random walk through scale
            const lastNote = pattern[pattern.length - 1] || 0;
            const direction = Math.random() > 0.5 ? 1 : -1;
            const step = Math.random() > 0.7 ? 2 : 1; // Occasional jumps
            let nextNote = lastNote + (direction * step);
            
            // Keep within scale bounds
            nextNote = Math.max(0, Math.min(scale.length - 1, nextNote));
            pattern.push(nextNote);
        }
        return pattern;
    }
    
    getCurrentScale() {
        const sectionLength = this.measureStructure[this.currentSection];
        return sectionLength >= 8 ? this.scale : this.pentatonic;
    }
    
    scheduleNextBeat() {
        if (!this.isPlaying || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const nextBeatTime = now + 0.05; // Small scheduling ahead
        
        // Process current beat immediately
        this.processBeat(nextBeatTime);
        
        // Advance timing
        this.currentBeat++;
        if (this.currentBeat >= 4) {
            this.currentBeat = 0;
            this.currentMeasure++;
            this.sectionMeasure++;
            this.processMeasure();
        }
        
        // Schedule next beat
        this.evolutionTimer = setTimeout(() => this.scheduleNextBeat(), this.beatDuration * 1000);
    }
    
    processBeat(beatTime) {
        // Beat-based musical events
        const beatInMeasure = this.currentBeat;
        const isDownbeat = beatInMeasure === 0;
        const isUpbeat = beatInMeasure === 2;
        const totalBeats = this.currentMeasure * 4 + this.currentBeat;
        
        // 8-bit Channel Updates
        this.update8BitChannels(beatTime, isDownbeat, isUpbeat, totalBeats);
        
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
        
        this.phase += 0.1;
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
                this.channels.arp.gain.gain.setValueAtTime(0.03, beatTime);
                this.channels.arp.gain.gain.exponentialRampToValueAtTime(0.001, beatTime + this.beatDuration * 0.25);
            }
            
            this.arpeggioIndex++;
        }
    }
    
    processMeasure() {
        const measuresInCurrentSection = this.measureStructure[this.currentSection];
        
        // Check if we need to move to next section
        if (this.sectionMeasure >= measuresInCurrentSection) {
            this.currentSection = (this.currentSection + 1) % this.measureStructure.length;
            this.sectionMeasure = 0;
            this.processSection();
        }
        
        // Measure-based changes
        const measureInSection = this.sectionMeasure;
        this.processMeasureChanges(measureInSection);
    }
    
    processSection() {
        const now = this.audioContext.currentTime;
        const sectionType = this.measureStructure[this.currentSection];
        
        console.log(`🎵 New 8-bit section: ${sectionType} measures`);
        
        // Regenerate melody for new section
        this.generateMelody();
        this.currentNote = 0;
        
        // Update arpeggio pattern based on section
        switch (sectionType) {
            case 4:
                this.arpeggioPattern = [0, 2, 4, 2]; // Simple triad
                break;
            case 8:
                this.arpeggioPattern = [0, 2, 4, 1, 3, 2]; // Extended pattern (removed 6)
                break;
            case 16:
                this.arpeggioPattern = [0, 2, 4, 2, 1, 3, 4, 3]; // Complex pattern
                break;
        }
        
        // Legacy harmonic changes for ambient layer
        this.oscillators.forEach((osc, i) => {
            if (osc.frequency) {
                let scaleIndex;
                
                switch (sectionType) {
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
        });
        
        // Master volume changes based on section
        const volumeMultiplier = sectionType === 16 ? 1.1 : (sectionType === 8 ? 0.95 : 0.85);
        const targetVolume = 0.06 * volumeMultiplier; // Reduced overall volume for 8-bit mix
        this.masterGain.gain.exponentialRampToValueAtTime(
            Math.max(targetVolume, 0.01), 
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
        const sectionType = this.measureStructure[this.currentSection];
        
        switch (sectionType) {
            case 4:
                return [0, 4, 2, 0, 1][harmonicIndex] || 0;
            case 8:
                return [0, 2, 4, 0, 6][harmonicIndex] || 0;
            case 16:
                return Math.floor(Math.sin(this.phase + harmonicIndex) * 3.5 + 3.5) % this.scale.length;
            default:
                return harmonicIndex % this.scale.length;
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
    }
    
    // Restart audio (used internally for persistence)
    restart() {
        if (this.isInitialized && !this.isPlaying && this.shouldPersist) {
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
            tempo: this.tempo
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
}

// Global instance - auto-initializes on first interaction
const HollieSound = new HollieAudio();

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HollieAudio;
}

// Global access
window.HollieSound = HollieSound;

// Debug function for console testing
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
