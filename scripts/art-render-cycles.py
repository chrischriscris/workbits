"""Path-trace the exported office in Blender Cycles from the app's art camera.

    blender -b -P scripts/art-render-cycles.py -- office.glb out.png [samples] [ortho_scale]

Output has a transparent background; composite it on #f4eee5 to compare with
art/style-scene.png. Picks Metal, OptiX or CUDA when available, else CPU.
"""

import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
src, out = argv[0], argv[1]
samples = int(argv[2]) if len(argv) > 2 else 96

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
scene = bpy.context.scene


def to_blender(x, y, z):
    """three.js (Y up) -> Blender (Z up)."""
    return Vector((x, -z, y))


# Materials: path tracing supplies the bounce light the real-time scene faked
# with emissive lift, so drop weak emission; keep real lamps.
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    for node in material.node_tree.nodes:
        if node.type != "BSDF_PRINCIPLED":
            continue
        emission = node.inputs.get("Emission Strength")
        color = node.inputs.get("Emission Color")
        if emission is not None and color is not None:
            c = color.default_value
            power = emission.default_value * max(c[0], c[1], c[2])
            if power < 0.6:
                emission.default_value = 0.0
        rough = node.inputs.get("Roughness")
        if rough is not None and not rough.is_linked:
            rough.default_value = max(rough.default_value, 0.45)

# Camera: same orthographic view as the app's art mode.
cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = float(argv[3]) if len(argv) > 3 else 19.5
cam_data.clip_start = 0.1
cam_data.clip_end = 200
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
cam.location = to_blender(20, 15, 20)
target = to_blender(0, 0.6, -0.3)
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

# Warm low afternoon sun from the window side, soft-edged.
sun_data = bpy.data.lights.new("sun", "SUN")
sun_data.energy = 6.5
sun_data.color = (1.0, 0.82, 0.62)
sun_data.angle = math.radians(4)
sun = bpy.data.objects.new("sun", sun_data)
scene.collection.objects.link(sun)
sun.location = to_blender(-12, 13, 7)
sun.rotation_euler = (Vector((0, 0, 0)) - sun.location).to_track_quat("-Z", "Y").to_euler()

# Soft warm sky fill.
world = bpy.data.worlds.new("world")
world.use_nodes = True
background = world.node_tree.nodes["Background"]
background.inputs[0].default_value = (1.0, 0.92, 0.82, 1.0)
background.inputs[1].default_value = 0.55
scene.world = world

scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
scene.cycles.device = "CPU"
for backend in ("METAL", "OPTIX", "CUDA", "HIP"):
    try:
        prefs.compute_device_type = backend
    except TypeError:
        continue
    prefs.get_devices()
    gpus = [d for d in prefs.devices if d.type != "CPU"]
    if gpus:
        for device in prefs.devices:
            device.use = True
        scene.cycles.device = "GPU"
        break
print("cycles device", scene.cycles.device, prefs.compute_device_type)
scene.cycles.samples = samples
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 6
scene.render.film_transparent = True
scene.render.resolution_x = 1440
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print("rendered", out)
