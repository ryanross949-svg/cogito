Project Overview
Cogito is a collection of interactive, Brilliant-style cognitive training simulators. Built entirely in pure HTML/CSS/JS. No backend. Progress saves locally to the browser via localStorage.

Architecture & File Structure
index.html: The Master Hub. Reads localStorage from all apps to display Global XP, Global Radar Chart, Robust Operator Profile, and houses the global Theme Switcher.
prima.html: First Principles / Elon Musk (Engineering) - v7.0 (Master Template)
nash.html: Game Theory / MIT 14.12 (Strategy) - v7.0 (Master Template)
oracle.html: AI Prompt Engineering & Agents (AI) - v7.6 (Master Template)
How to Build a New App
Copy oracle.html (it is the most stable, fully-featured template).
Update the STORAGE_KEY variable (e.g., fermi-v1).
Update the MODULES array (10 axes).
Update the CARDS array (120 flashcards, 12 per module).
Update the ARENA array (100 problems, 10 per module, 4 difficulty tiers).
Update the PROJECT_PHASES array (10 cumulative project phases).
Update the REAL_WORLD_MISSIONS array (30 daily missions).
Add the new app to the APPS array in index.html so it tracks on the Global Dashboard. Its `domain` MUST be one of the 7 master discipline keys in the DISCIPLINES array: physics, math, compute, life, mind, strategy, systems. The Global Mastery Matrix (radar) and Discipline Breakdown aggregate every course up to these 7 axes (average maturity per discipline; XP summed). An unknown domain is now skipped gracefully instead of crashing the hub, but the course won't appear until its domain matches a discipline.
Ensure the Theme Switcher CSS, HTML, and JS are included (copy from ORACLE v7.6).
Key Mechanics
Spaced Repetition (SM-2): Flashcards schedule based on quality (1-5). Maturity is 21+ days.
Progression: A module is marked "complete" when the Lesson is read AND 1 Arena problem is solved. This unlocks the next module.
Arena Difficulties: 1 (Easy, 50 XP), 2 (Medium, 100 XP), 3 (Hard, 200 XP), 4 (Expert, 500 XP). Distractors must be plausible MBA/engineering advice.
Leveling: Math.floor(Math.sqrt(xp/100)) + 1.
Global Hub: index.html parses the JSON of all app save keys to sum Total XP, average Maturity, and generate a Radar Chart + Profile based on balance.
Strict Project Gating: Project Phase N only unlocks if Module N is unlocked AND Project Phase N-1 is solved.
Themes: 5 themes (Quantum, Matrix, Cyberpunk, Light, Nord) controlled via data-theme attribute on <body> and localStorage key cogito-theme.
Syntax Rules: NEVER use backticks (`) inside JavaScript strings. Use single quotes and string concatenation (+) to avoid fatal parsing errors.
