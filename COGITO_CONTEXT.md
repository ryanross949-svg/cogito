Project Overview
Cogito is a collection of interactive, Brilliant-style cognitive training simulators. Built entirely in pure HTML/CSS/JS. No backend. Progress saves locally to the browser via localStorage.

Architecture & File Structure
index.html: The Master Hub. Reads localStorage from all apps to display Global XP, Global Radar Chart, and Robust Operator Profile.
prima.html: First Principles / Elon Musk (Engineering) - v7.0 (Master Template)
nash.html: Game Theory / MIT 14.12 (Strategy) - Needs v7.0 update
oracle.html: AI Prompt Engineering & Agents (AI) - Needs v7.0 update
How to Build a New App
Copy prima.html (v7.0 is the master template).
Update the STORAGE_KEY variable (e.g., fermi-v1).
Update the MODULES array (10 axes).
Update the CARDS array (120 flashcards, 12 per module).
Update the ARENA array (100 problems, 10 per module, 4 difficulty tiers).
Update the PROJECT_PHASES array (10 cumulative project phases).
Update the REAL_WORLD_MISSIONS array (30 daily missions).
Add the new app to the APPS array in index.html so it tracks on the Global Dashboard.
Key Mechanics
Spaced Repetition (SM-2): Flashcards schedule based on quality (1-5). Maturity is 21+ days.
Progression: A module is marked "complete" when the Lesson is read AND 1 Arena problem is solved. This unlocks the next module.
Arena Difficulties: 1 (Easy, 50 XP), 2 (Medium, 100 XP), 3 (Hard, 200 XP), 4 (Expert, 500 XP).
Leveling: Math.floor(Math.sqrt(xp/100)) + 1.
Global Hub: index.html parses the JSON of all app save keys to sum Total XP, average Maturity, and generate a Radar Chart + Profile based on balance.
To-Do List
Update nash.html to match PRIMA v7.0 features (120 cards, 100 arena, 30 missions, hub link).
Update oracle.html to match PRIMA v7.0 features (120 cards, 100 arena, 30 missions, hub link).
Create fermi.html (Math & Physics) using the v7.0 template.
