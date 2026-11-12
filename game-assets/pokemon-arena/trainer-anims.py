# Trainer with idle + cheer + walk + run in one small GLB (for the arena and the world).
# Run: blender -b -P trainer-anims.py -- <trainer assets dir> <output glb>
import bpy, sys, os

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, "anim_idle.glb"))
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
idle = arm.animation_data.action
idle.name = "idle"
names = {b.name for b in arm.data.bones}


def grab(path, name):
    keep = set(bpy.data.objects)
    if path.endswith(".glb"):
        bpy.ops.import_scene.gltf(filepath=path)
    else:
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False)
    extra = [o for o in bpy.data.objects if o not in keep]
    a2 = next(o for o in extra if o.type == "ARMATURE")
    act = a2.animation_data.action
    act.name = name
    act.use_fake_user = True
    hit = 0
    print("ACTION", name)
    for o in extra:
        bpy.data.objects.remove(o, do_unlink=True)
    return act


acts = [idle,
        grab(os.path.join(SRC, "anim_victory-cheer.glb"), "cheer"),
        grab(os.path.join(SRC, "anim_walking.fbx"), "walk"),
        grab(os.path.join(SRC, "anim_running.fbx"), "run")]

ad = arm.animation_data
for act in acts:
    tr = ad.nla_tracks.new()
    tr.name = act.name
    tr.strips.new(act.name, int(act.frame_range[0]), act)
ad.action = None

for img in bpy.data.images:
    if img.size[0] > 1024:
        img.scale(1024, 1024)

bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_image_format="JPEG",
                          export_jpeg_quality=82, export_animations=True, export_nla_strips=True)
print("WROTE", os.path.getsize(OUT))
