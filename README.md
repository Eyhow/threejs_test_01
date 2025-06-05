For local testing, open the folder with VS Code Live Server extension or run:

python -m http.server

And open http://localhost:8000 to test your Three.js page live.





Improvements :

Lighting + Shadows (stylized and harsh, not realistic) - - - DONE ✅

UI + Sound (a bit later)

Visual Glitches & Artifacts (maybe later)

Environmental Details (later)

Vignette overlay - - - DONE ✅

Blinking pixels effect - - - DONE ✅

Vertigo camera effect (subtle FOV oscillation when idle) - - - DONE ✅

View bobbing while walking - - - DONE ✅

Collision detection on houses - - - DONE ✅

Pixelated sharp textures using NearestFilter - - - DONE ✅

Lower render resolution upscaled via CSS - - - DONE ✅

Screen line overlay effect - - - DONE ✅



UPLOAD TO GIT :

1. Open your terminal/command prompt and navigate to your project folder:

>cd path/to/your/project


2. Stage all changes (new, modified, deleted files):

>git add .


3. Commit the changes with a descriptive message:

>git commit -m "Your commit message here"

4. Push the changes to the remote GitHub repository:

>git push


The first time you push, you might need to set the upstream branch:

>git push -u origin main


>git config --global user.email "contactjsspro@gmail.com"
>git config --global user.name "Eyhow"

>git remote add origin https://github.com/Eyhow/threejs_test_01.git

After that, just git push is enough.
Make sure your GitHub credentials or SSH keys are set up so the push succeeds.
Your GitHub Pages site updates automatically after you push changes to the branch it serves from (usually main or master).