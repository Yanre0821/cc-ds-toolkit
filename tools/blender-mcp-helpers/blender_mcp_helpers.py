"""
Blender MCP 辅助函数库
======================

适用于 Blender 4.2+ + Blender MCP (`mcp__blender__execute_blender_code`)

提供 4 类工具：
  1. 材质创建（适配 Blender 4.x API）
  2. 几何基元（box/cylinder/sphere + 异形壳体）
  3. 渲染设置（EEVEE Next）
  4. 多视角相机模板

用法示例（MCP 调用）：
    mcp__blender__execute_blender_code(code='''
        from blender_mcp_helpers import add_box, add_cyl
        add_box("test", (0,0,0), (0.05, 0.05, 0.05), "#ff0000")
    ''')

实测案例：超声波探伤实验装置 3D 重建
"""

import bpy
from mathutils import Vector


# ============================================================
# 1. 材质创建
# ============================================================

def color_rgba(hex_color, alpha=1.0):
    """hex → RGBA (0-1 浮点)"""
    h = hex_color.lstrip('#')
    return (int(h[0:2], 16)/255.0, int(h[2:4], 16)/255.0, int(h[4:6], 16)/255.0, alpha)


def get_or_create_mat(name, hex_color, metallic=0.0, roughness=0.5):
    """
    创建或获取 PBR 材质（适配 Blender 4.x）
    关键：用 node.type 而非节点名查找 BSDF（节点名因版本而异）
    """
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
    else:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = None
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF':
            bsdf = node
            break
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color_rgba(hex_color)
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
    return mat


# ============================================================
# 2. 几何基元
# ============================================================

def add_box(name, loc, dims, hex_color, metallic=0.0, roughness=0.5):
    """
    添加立方体
    :param name: 物体名
    :param loc: 位置 (x, y, z) 单位 m
    :param dims: 尺寸 (sx, sy, sz) 单位 m
    :param hex_color: 颜色如 "#3a3a3a"
    """
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (dims[0], dims[1], dims[2])
    mat = get_or_create_mat(f"M_{name}", hex_color, metallic, roughness)
    obj.data.materials.append(mat)
    return obj


def add_cyl(name, loc, radius, height, hex_color, axis='Z', metallic=0.0, roughness=0.5):
    """
    添加圆柱
    :param axis: 'X' / 'Y' / 'Z' (默认 Z)
    关键：Blender 默认沿 Z 轴，X/Y 轴需要旋转
    """
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=height, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    if axis == 'X':
        obj.rotation_euler = (0, 1.5708, 0)  # 绕 Y 转 90°
    elif axis == 'Y':
        obj.rotation_euler = (1.5708, 0, 0)  # 绕 X 转 90°
    mat = get_or_create_mat(f"M_{name}", hex_color, metallic, roughness)
    obj.data.materials.append(mat)
    return obj


def add_sphere(name, loc, radius, hex_color, metallic=0.0, roughness=0.5):
    """添加球体"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=loc, segments=32, ring_count=16)
    obj = bpy.context.active_object
    obj.name = name
    mat = get_or_create_mat(f"M_{name}", hex_color, metallic, roughness)
    obj.data.materials.append(mat)
    return obj


def add_trapezoid_housing(name, hex_color, metallic=0.7, roughness=0.4):
    """
    斜边异形三角壳体（上窄下宽 + 左上角斜切）
    用 from_pydata 自定义顶点+面，避开 boolean 复杂度

    默认参数（超声波探伤装置的位移台）：
      底 90mm 宽, 顶 60mm 宽, 高 140mm, 深 80mm
      斜切 30mm × 40mm (左上角)
    """
    verts = [
        # 底面 z=0.08 (宽 90mm)
        (-0.24, -0.04, 0.08), (-0.15, -0.04, 0.08),
        (-0.15,  0.04, 0.08), (-0.24,  0.04, 0.08),
        # 顶面 z=0.22 (窄 60mm, 左侧内移 30mm)
        (-0.21, -0.04, 0.22), (-0.15, -0.04, 0.22),
        (-0.15,  0.04, 0.22), (-0.21,  0.04, 0.22),
        # 斜切转折点 z=0.18
        (-0.24, -0.04, 0.18), (-0.24,  0.04, 0.18),
    ]
    faces = [
        (0, 1, 2, 3),        # 底面
        (1, 5, 6, 2),        # 右面
        (3, 2, 6, 7, 9),     # 后面
        (0, 8, 4, 5, 1),     # 前面
        (0, 3, 9, 8),        # 左下垂直面
        (8, 9, 7, 4),        # 斜切面
        (4, 5, 6, 7),        # 顶面
    ]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()  # Blender 4.x 已无 calc_normals()，update() 自动计算
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mat = get_or_create_mat(f"M_{name}", hex_color, metallic, roughness)
    obj.data.materials.append(mat)
    return obj


# ============================================================
# 3. 渲染设置
# ============================================================

def setup_render_eevee(res_x=1920, res_y=1080, samples=64):
    """
    设置 EEVEE Next 渲染引擎（Blender 4.x 必须用 BLENDER_EEVEE_NEXT）
    """
    bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'
    bpy.context.scene.render.resolution_x = res_x
    bpy.context.scene.render.resolution_y = res_y
    bpy.context.scene.eevee.taa_render_samples = samples
    bpy.context.scene.render.film_transparent = False
    bpy.context.scene.view_settings.view_transform = 'Standard'


def hide_water_tank(keyword="水箱_"):
    """临时隐藏水箱等透明物体（避免 alpha 叠加发白）"""
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name.startswith(keyword):
            o.hide_render = True
            o.hide_viewport = True


def show_water_tank(keyword="水箱_"):
    """恢复显示水箱"""
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name.startswith(keyword):
            o.hide_render = False
            o.hide_viewport = False


# ============================================================
# 4. 多视角相机模板
# ============================================================

def render_view(name, loc, look_at, focal_mm, out_path):
    """
    在指定位置创建相机并渲染
    :param name: 相机名
    :param loc: 相机位置 (x, y, z) 单位 m
    :param look_at: 看向的点 (x, y, z)
    :param focal_mm: 焦距 (mm), 35=标准, 26=广角, 50=中焦
    :param out_path: 完整输出路径
    """
    bpy.ops.object.camera_add(location=loc)
    cam = bpy.context.active_object
    cam.name = f"Cam_{name}"
    direction = Vector(look_at) - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = focal_mm
    bpy.context.scene.camera = cam
    bpy.context.scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)


def render_multi_views(views, out_dir):
    """
    批量渲染多视角
    :param views: list of dict, 每个含 name/loc/look_at/focal_mm
    :param out_dir: 输出目录
    """
    import os
    for v in views:
        out_path = os.path.join(out_dir, f"{v['name']}.png")
        render_view(v['name'], v['loc'], v['look_at'], v['focal_mm'], out_path)
        print(f"  ✓ 渲染: {v['name']} → {out_path}")


# ============================================================
# 5. FOV 公式（查表参考）
# ============================================================
#
# 35mm 全画幅传感器（24mm × 36mm）：
#   vertical_capture = 2 × D × tan(arctan(18/F))
#   horizontal_capture = 2 × D × tan(arctan(24/F))
#   D = 距离 (m), F = 焦距 (mm)
#
# 查表（vertical capture, m）：
#   D\F      26mm   28mm   32mm   35mm   50mm
#   0.40m   0.55   0.51   0.45   0.41   0.29
#   0.50m   0.69   0.64   0.56   0.51   0.36
#   0.70m   0.97   0.90   0.79   0.72   0.50
#   0.85m   1.18   1.09   0.96   0.88   0.61
#
# 推荐配置（超声波探伤装置 0.39m × 0.30m）：
#   - 紧凑版（主体 80% 画面）：F=26mm @ D=0.50m
#   - 标准版（主体 60% 画面）：F=35mm @ D=0.55m
#   - 远景版（背景可见）：    F=32mm @ D=0.80m


# ============================================================
# 6. 部件删除（处理 RNA 错误）
# ============================================================

def safe_delete_objects(names):
    """安全删除物体列表（先存名字再删，避免 RNA 错误）"""
    deleted = 0
    for name in names:
        if name in bpy.data.objects:
            obj = bpy.data.objects[name]
            bpy.data.objects.remove(obj, do_unlink=True)
            deleted += 1
    return deleted


# ============================================================
# 7. 对齐检查工具
# ============================================================

def check_axis_alignment(obj1, obj2, axis='z', tol=0.0001):
    """
    检查两个物体的某轴坐标是否对齐
    :return: True if 对齐, 差值 (m)
    """
    if axis == 'x':
        diff = abs(obj1.location.x - obj2.location.x)
    elif axis == 'y':
        diff = abs(obj1.location.y - obj2.location.y)
    else:  # z
        diff = abs(obj1.location.z - obj2.location.z)
    aligned = diff < tol
    return aligned, diff


def check_water_tank_containment(housing, tank_left_wall_x=-0.15):
    """
    检查位移台外壳是否在水箱内
    :param housing: 位移台外壳对象
    :param tank_left_wall_x: 水箱左壁外侧 X 坐标
    :return: (is_inside, max_x_of_housing)
    """
    if not housing.data or not housing.data.vertices:
        return None, None
    xs = [v.co.x for v in housing.data.vertices]
    max_x = max(xs)
    return max_x > tank_left_wall_x, max_x
