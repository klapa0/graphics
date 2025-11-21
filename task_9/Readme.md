## Motivation

The main goal of this project was to create an **educational and interactive visualization** of the Solar System. A key feature is the **custom day/night shader** for Earth, which demonstrates how sunlight affects planetary surfaces and transitions smoothly between **day and night**. This allows users to observe the rotation of the Earth and the effect of sunlight in real time, enhancing the learning experience.

## Shader Description

### Implementation

- The Earth uses a **custom fragment shader** with these uniforms:
  - `dayMap` – texture for the daytime surface
  - `nightMap` – texture for the nighttime surface
  - `sunPosition` – the Sun's position in the scene
- The shader calculates the **dot product between the surface normal and the light direction** to determine which areas are illuminated.
- A **smoothstep** function is used to create a soft transition between day and night, avoiding harsh borders.
- Normals are correctly transformed into **world space**, ensuring accurate lighting regardless of camera position.

### Visual and Interactive Effects

- Users can rotate around the Solar System and observe how the day/night boundary moves on Earth.
- The shader dynamically updates with the Sun's position, maintaining realistic lighting as planets orbit.
- Smooth transitions between textures create a **more immersive and visually appealing experience** compared to simple opacity blending.

### Previous Issues

Earlier attempts using **opacity blending** to mix day and night textures had several problems:

- The night side was not fully visible.


## Sources

-  [https://sangillee.com/2024-06-07-create-realistic-earth-with-shaders/](https://sangillee.com/2024-06-07-create-realistic-earth-with-shaders/)

- Textures were downloaded from: https://www.solarsystemscope.com/textures/


