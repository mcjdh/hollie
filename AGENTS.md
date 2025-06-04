# AGENTS Instructions

This repository hosts a variety of generative art HTML files. The following guidelines help future agents maintain consistency.

## Repository Overview
- `index.html` is the main entry page.
- `gen2`, `gen2-visual`, `gen3`, and `visualizations` contain individual generative art pages.
- `source01.zip` is an archived snapshot; it is not used during development.

## Coding Style
- Use 4 spaces for indentation.
- Keep inline CSS formatting consistent with the existing files in visualizations folder.
- File names should stay lowercase and hyphen-separated.
- When adding new art pages, keep them independent in folder they were made in most of the time, though perhaps update `index.html` if appropriate.
- Consider efficient simple minimal code line count, with emergent depth through procedural generation
- Consider isomorphic algorithms, ascii art, and things like balance and game theory
- Prioritize raw math code and true accuracy symbolism
- Avoid verbose language or lots of pretense
- Simple yet evolving depth is good
- Generally optimize complex or over engineered systems for good compatibility  
- Prefer native html css js and json. avoid external dependencies or web links in code generally

## Commit Practices
- Write clear commit messages explaining the intent of each change.
- Keep pull requests focused and descriptive.

## Testing
- There are no automated tests in this project. Preview modified HTML files in a browser to verify they render as expected.

## Pull Request Notes
- Summarize your changes and mention any important files in the PR description.
- Indicate that no tests were run because none are defined.
