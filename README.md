# Homework 6: City Generation

Name: Gizem Dal

Pennkey: gizemdal

Live demo: https://gizemdal.github.io/hw06-city-generation/

## Resources
As my base code, I used my terrain shader from HW1 (Noisy Terrain Generation) and HW5 (Procedural Roads). Aside from the provided resources for this assignment, I referenced The Book of Shaders (https://thebookofshaders.com) and Iniqo Quilez's blog for my background sky texture, the lava water simulation and other implementations of noise functions. I used the free obj files for my building generation from the following website: https://people.sc.fsu.edu/~jburkardt/data/obj/. The paper "Real-time Procedural Generation of 'Pseudo Infinite' Cities" was very helpful in understanding how the procedural buildings can be generated.

## Project Goal
For this project, I aimed to generate a 3D procedural city with a mixture of "modern" and "dark" themes. The modern theme can be seen through the texture and style of the buildings while the dark theme is more focused on the color choices for the terrain, procedural sky and the "lava" water.

View of the city without terrain
![](progress_imgs/cityview.png)

## Features and Techniques

# 3D Terrain

I refactored my 2D procedural terrain code from HW5 to turn it into a 3D terrain where the water level is drawn lower than the land. I used my shore() function from the 2D terrain generation, where I determine the coast line for my terrain and divide the land from water using the sin() function with different amplitudes and frequencies depending on the depth. The transition from land to water happens more smoothly compared to 2D terrain due to the slope at the area in-between these two types of land.

# Procedural Roads

I generated my road network similar to the technique I implemented for HW5 where I used L-Systems to define expansion rules for my roads and rendered them by using an instanced shader. For this assignment, I altered my implementation such that the roads expand with 90 degrees from the course and the grid divisions with more narrow streets happen after the highways are generated. The roads are drawn slightly above the ground to be recognized.

# 2D Raster Grid

In order to determine where I could place my procedurally generated grids, I divided my terrain into smaller grids and created a 2D rasterization boolean grid where I store the occupation state of each grid coordinate. After I genereate all the roads and subdivisions, I rasterize every road in my scene into this 2D array. In order to handle approximations and very close coordinates, I rasterize my roads by giving them widths that are larger than their original width to ensure that the buildings don't fall on the roads. Besides the roads, the water areas are also marked as "occupied" in this 2D grid since buildings cannot be spawned on water.

# Procedurally Generated Buildings and Their Placement

From my 2D rasterization grid, I select 100 potential coordinates (I picked this number arbitrarily as the number of buildings I want to generate in my scene) for my buildings randomly, confirming that these are valid, "non-occupied" coordinates before I assign them. After the coordinates are set, I generate my buildings by using my population density map and multiple mesh object files. I first check how dense the population is at the selected coordinate for my building, which will determine the height. My implementation ensures that the buildings spawned in more populated areas have greater heights compared to lower population density areas. If the population density at the given area falls above a certain (hardcoded) threshold, I start-off my building with the "skyscraper" mesh on top and then extrude towards the bottom with randomly picked polygonal meshes until I reach the ground. This process is pretty much the same for buildings at less dense areas except that they don't start-off with the skyscraper mesh. The intermediate meshes (hexagonal prism, pentagonal prism and cube) are selected randomly. The structure of these buildings are created on the CPU as VBO data and rendered by using the instanced shader.

# Building Texture

In order to make my buildings look more modern, I used a square wave noise function to generate black and white stripes to show contrast. I also included gray segments on the buildings to represent the windows.

# Lighting

I included three sources of light in my scene to ensure that my scene doesn't contain any purely black shadows. I implemented lambertian shading with a touch of blinn phong by including specular intensity in my final light color.

# Procedural Sky

I implemented a red procedural sky by referencing The Book of Shaders to represent my background, and go along with the terrain and water color choices.

# Other Features

I included a Controls Panel on the right where the user can decide the number of iterations the road L-System should go through, the L-System axiom to generate more interesting roads ('F' for roads moving forward and branching out as smaller streets, 'R' for branching out highways). I also included the option for viewing the population density and terrain maps either separately or together on the screen.

# Challenges and Difficulties

As I stated on my Piazza posts https://piazza.com/class/jr11vjieq8t6om?cid=155 and https://piazza.com/class/jr11vjieq8t6om?cid=150, I had trouble with displaying my roads and buildings rendered by the instanced shader at the same time as my terrain and background that use different shader programs. That is why the code I'm submitting will only display the roads and procedural buildings. In order to disable the instanced shader and view the terrain and background, comment out the part in tick() inside main.ts where I use instanced shader to render building meshes and my roads.

# Screenshots from the Project

Sneak Peek to an Early Step:

![](progress_imgs/early.png)

Rastered grids:

![](progress_imgs/raster_ex.png)

Closer view:

![](progress_imgs/closerview.png) ![](progress_imgs/buildings.png)

Far view:

![](progress_imgs/farview.png)

Terrain Maps:

![](progress_imgs/terrain1.png) ![](progress_imgs/terrainpop.png)

![](progress_imgs/terrainter.png) ![](progress_imgs/terrainboth.png)

