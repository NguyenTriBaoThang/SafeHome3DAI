"""
SafeHome3D AI - Photorealistic Furniture & Asset Generator
Generates high-fidelity GLB models for the isometric dollhouse digital twin.
"""

import os
import numpy as np
import trimesh
from trimesh.creation import box, cylinder, capsule, icosphere

def create_double_bed():
    """Generates a luxury Scandinavian double bed matching the reference image."""
    parts = []
    
    # 1. Light Oak Wooden Base / Plinth (recessed)
    plinth = box(extents=[1.76, 0.12, 1.96])
    plinth.apply_translation([0, 0.06, 0])
    plinth.visual = trimesh.visual.ColorVisuals(mesh=plinth, vertex_colors=[218, 185, 145, 255])
    parts.append(plinth)
    
    # 2. Main Wood Bed Frame (Side rails and footboard)
    # Left rail
    rail_l = box(extents=[0.12, 0.32, 2.12])
    rail_l.apply_translation([-0.94, 0.22, 0])
    rail_l.visual = trimesh.visual.ColorVisuals(mesh=rail_l, vertex_colors=[205, 170, 130, 255])
    parts.append(rail_l)
    
    # Right rail
    rail_r = box(extents=[0.12, 0.32, 2.12])
    rail_r.apply_translation([0.94, 0.22, 0])
    rail_r.visual = trimesh.visual.ColorVisuals(mesh=rail_r, vertex_colors=[205, 170, 130, 255])
    parts.append(rail_r)
    
    # Footboard
    footboard = box(extents=[2.0, 0.32, 0.12])
    footboard.apply_translation([0, 0.22, 1.0])
    footboard.visual = trimesh.visual.ColorVisuals(mesh=footboard, vertex_colors=[205, 170, 130, 255])
    parts.append(footboard)
    
    # 3. Upholstered Headboard (Large cushioned backing with warm cream fabric)
    headboard_backing = box(extents=[2.04, 0.85, 0.14])
    headboard_backing.apply_translation([0, 0.58, -1.02])
    headboard_backing.visual = trimesh.visual.ColorVisuals(mesh=headboard_backing, vertex_colors=[215, 180, 140, 255])
    parts.append(headboard_backing)
    
    # Cushioned Headboard Panels (2 vertical padded sections)
    for sign in [-1, 1]:
        cushion = box(extents=[0.92, 0.72, 0.10])
        cushion.apply_translation([sign * 0.48, 0.62, -0.96])
        cushion.visual = trimesh.visual.ColorVisuals(mesh=cushion, vertex_colors=[242, 238, 230, 255])
        parts.append(cushion)
    
    # 4. Mattress (Comfortable thick mattress with bevel)
    mattress = box(extents=[1.76, 0.28, 1.94])
    mattress.apply_translation([0, 0.36, -0.02])
    mattress.visual = trimesh.visual.ColorVisuals(mesh=mattress, vertex_colors=[250, 248, 245, 255])
    parts.append(mattress)
    
    # 5. Duvet / Quilt (Thick comforter covering body with folds)
    duvet_main = box(extents=[1.82, 0.14, 1.48])
    duvet_main.apply_translation([0, 0.50, 0.24])
    duvet_main.visual = trimesh.visual.ColorVisuals(mesh=duvet_main, vertex_colors=[245, 242, 236, 255])
    parts.append(duvet_main)
    
    # Duvet fold over top (Turned-down linen layer)
    duvet_turn = box(extents=[1.80, 0.08, 0.26])
    duvet_turn.apply_translation([0, 0.52, -0.48])
    duvet_turn.visual = trimesh.visual.ColorVisuals(mesh=duvet_turn, vertex_colors=[235, 230, 222, 255])
    parts.append(duvet_turn)
    
    # Duvet side drapes (Left and Right hanging down)
    duvet_drape_l = box(extents=[0.08, 0.24, 1.46])
    duvet_drape_l.apply_translation([-0.92, 0.36, 0.24])
    duvet_drape_l.visual = trimesh.visual.ColorVisuals(mesh=duvet_drape_l, vertex_colors=[240, 237, 230, 255])
    parts.append(duvet_drape_l)
    
    duvet_drape_r = box(extents=[0.08, 0.24, 1.46])
    duvet_drape_r.apply_translation([0.92, 0.36, 0.24])
    duvet_drape_r.visual = trimesh.visual.ColorVisuals(mesh=duvet_drape_r, vertex_colors=[240, 237, 230, 255])
    parts.append(duvet_drape_r)
    
    # Duvet foot drape
    duvet_drape_foot = box(extents=[1.80, 0.24, 0.08])
    duvet_drape_foot.apply_translation([0, 0.36, 0.98])
    duvet_drape_foot.visual = trimesh.visual.ColorVisuals(mesh=duvet_drape_foot, vertex_colors=[240, 237, 230, 255])
    parts.append(duvet_drape_foot)
    
    # 6. Pillows (4 Pillows in 2 rows, angled naturally)
    # Back Row (2 large sleeping pillows propped up against headboard)
    for sign in [-1, 1]:
        p1 = box(extents=[0.74, 0.18, 0.44])
        p1.apply_transform(trimesh.transformations.rotation_matrix(np.radians(-22), [1, 0, 0]))
        p1.apply_translation([sign * 0.44, 0.60, -0.74])
        p1.visual = trimesh.visual.ColorVisuals(mesh=p1, vertex_colors=[252, 250, 248, 255])
        parts.append(p1)
        
    # Front Row (2 accent pillows, slightly turned and contrasting warm grey/taupe)
    for sign in [-1, 1]:
        p2 = box(extents=[0.58, 0.15, 0.36])
        p2.apply_transform(trimesh.transformations.rotation_matrix(np.radians(-16), [1, 0, 0]))
        p2.apply_translation([sign * 0.42, 0.54, -0.52])
        color = [215, 205, 195, 255] if sign < 0 else [225, 218, 210, 255]
        p2.visual = trimesh.visual.ColorVisuals(mesh=p2, vertex_colors=color)
        parts.append(p2)
        
    # 7. Decorative Throw Blanket (Draped diagonally across corner at foot of bed)
    blanket = box(extents=[1.10, 0.04, 0.75])
    blanket.apply_transform(trimesh.transformations.rotation_matrix(np.radians(14), [0, 1, 0]))
    blanket.apply_translation([0.35, 0.58, 0.55])
    blanket.visual = trimesh.visual.ColorVisuals(mesh=blanket, vertex_colors=[185, 140, 125, 255]) # Warm terracotta/rust accent
    parts.append(blanket)
    
    blanket_side = box(extents=[0.06, 0.32, 0.65])
    blanket_side.apply_translation([0.94, 0.38, 0.62])
    blanket_side.visual = trimesh.visual.ColorVisuals(mesh=blanket_side, vertex_colors=[185, 140, 125, 255])
    parts.append(blanket_side)
    
    scene = trimesh.Scene(parts)
    return scene

def create_walkin_wardrobe():
    """Generates the L-shaped open modular wardrobe system with hanging clothes."""
    parts = []
    wood_color = [210, 180, 142, 255]
    dark_wood = [160, 125, 90, 255]
    metal_color = [200, 200, 205, 255]
    
    # Overall dimensions: Main section along back wall + L-corner return
    # Main upright frames (height 2.2m, depth 0.55m, thickness 0.03m)
    upright_x_positions = [-1.3, -0.5, 0.3, 1.1]
    for x in upright_x_positions:
        upright = box(extents=[0.03, 2.2, 0.55])
        upright.apply_translation([x, 1.1, 0])
        upright.visual = trimesh.visual.ColorVisuals(mesh=upright, vertex_colors=wood_color)
        parts.append(upright)
        
    # Top shelf (full length)
    top_shelf = box(extents=[2.43, 0.03, 0.55])
    top_shelf.apply_translation([-0.1, 2.185, 0])
    top_shelf.visual = trimesh.visual.ColorVisuals(mesh=top_shelf, vertex_colors=wood_color)
    parts.append(top_shelf)
    
    # Bottom plinth/base
    bottom_shelf = box(extents=[2.43, 0.08, 0.55])
    bottom_shelf.apply_translation([-0.1, 0.04, 0])
    bottom_shelf.visual = trimesh.visual.ColorVisuals(mesh=bottom_shelf, vertex_colors=wood_color)
    parts.append(bottom_shelf)
    
    # Storage Baskets / Boxes on top shelf
    for i, bx in enumerate([-1.05, -0.75, -0.25, 0.05, 0.55, 0.85]):
        b_color = [225, 215, 195, 255] if i % 2 == 0 else [240, 235, 225, 255]
        basket = box(extents=[0.24, 0.22, 0.45])
        basket.apply_translation([bx, 2.31, 0])
        basket.visual = trimesh.visual.ColorVisuals(mesh=basket, vertex_colors=b_color)
        parts.append(basket)
        
    # Section A: Left Bay (Hanging upper + Hanging lower)
    # Upper Hanging Rod
    rod_a1 = cylinder(radius=0.015, height=0.76, sections=16)
    rod_a1.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [0, 0, 1]))
    rod_a1.apply_translation([-0.9, 1.95, 0])
    rod_a1.visual = trimesh.visual.ColorVisuals(mesh=rod_a1, vertex_colors=metal_color)
    parts.append(rod_a1)
    
    # Clothes hanging in Left Bay
    shirt_colors = [
        [245, 245, 250, 255], # Crisp White shirt
        [70, 90, 120, 255],   # Navy button-down
        [180, 175, 165, 255], # Taupe linen
        [40, 45, 50, 255],    # Charcoal jacket
        [210, 195, 175, 255], # Beige trench
        [120, 140, 130, 255], # Sage green
    ]
    for i, clr in enumerate(shirt_colors):
        sx = -1.22 + i * 0.12
        # Hanger triangle
        hanger = box(extents=[0.08, 0.02, 0.38])
        hanger.apply_translation([sx, 1.92, 0])
        hanger.visual = trimesh.visual.ColorVisuals(mesh=hanger, vertex_colors=[180, 140, 100, 255])
        parts.append(hanger)
        
        # Garment body
        shirt = box(extents=[0.07, 0.65, 0.42])
        shirt.apply_translation([sx, 1.56, 0])
        shirt.visual = trimesh.visual.ColorVisuals(mesh=shirt, vertex_colors=clr)
        parts.append(shirt)
        
    # Intermediate shelf in Left Bay
    mid_shelf_a = box(extents=[0.77, 0.03, 0.55])
    mid_shelf_a.apply_translation([-0.9, 1.15, 0])
    mid_shelf_a.visual = trimesh.visual.ColorVisuals(mesh=mid_shelf_a, vertex_colors=wood_color)
    parts.append(mid_shelf_a)
    
    # Lower Hanging Rod in Left Bay
    rod_a2 = cylinder(radius=0.015, height=0.76, sections=16)
    rod_a2.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [0, 0, 1]))
    rod_a2.apply_translation([-0.9, 1.05, 0])
    rod_a2.visual = trimesh.visual.ColorVisuals(mesh=rod_a2, vertex_colors=metal_color)
    parts.append(rod_a2)
    
    for i, clr in enumerate(shirt_colors[:4]):
        sx = -1.18 + i * 0.16
        trousers = box(extents=[0.08, 0.55, 0.32])
        trousers.apply_translation([sx, 0.72, 0])
        trousers.visual = trimesh.visual.ColorVisuals(mesh=trousers, vertex_colors=clr)
        parts.append(trousers)
        
    # Section B: Middle Bay (Shelves with Folded Clothes & Drawers)
    for y in [0.85, 1.25, 1.65]:
        sh = box(extents=[0.77, 0.03, 0.55])
        sh.apply_translation([-0.1, y, 0])
        sh.visual = trimesh.visual.ColorVisuals(mesh=sh, vertex_colors=wood_color)
        parts.append(sh)
        
    # Folded clothes stacks on middle shelves
    for y_base in [0.88, 1.28, 1.68]:
        for stack_x in [-0.32, 0.12]:
            for layer in range(3):
                col = [230 - layer*15, 225 - layer*10, 215 + layer*5, 255]
                stack = box(extents=[0.32, 0.045, 0.40])
                stack.apply_translation([stack_x, y_base + layer * 0.05 + 0.025, 0])
                stack.visual = trimesh.visual.ColorVisuals(mesh=stack, vertex_colors=col)
                parts.append(stack)
                
    # Lower Drawers in Middle Bay (2 smooth drawers)
    for dy in [0.22, 0.56]:
        drawer = box(extents=[0.76, 0.30, 0.53])
        drawer.apply_translation([-0.1, dy, 0.01])
        drawer.visual = trimesh.visual.ColorVisuals(mesh=drawer, vertex_colors=dark_wood)
        parts.append(drawer)
        
        # Metal drawer handle
        handle = cylinder(radius=0.008, height=0.22, sections=12)
        handle.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [0, 0, 1]))
        handle.apply_translation([-0.1, dy, 0.28])
        handle.visual = trimesh.visual.ColorVisuals(mesh=handle, vertex_colors=metal_color)
        parts.append(handle)
        
    # Section C: Right Bay (Long Coat / Dress Hanging)
    rod_c = cylinder(radius=0.015, height=0.76, sections=16)
    rod_c.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [0, 0, 1]))
    rod_c.apply_translation([0.7, 1.95, 0])
    rod_c.visual = trimesh.visual.ColorVisuals(mesh=rod_c, vertex_colors=metal_color)
    parts.append(rod_c)
    
    long_coats = [
        [55, 60, 65, 255],     # Dark trench
        [190, 180, 160, 255],  # Camel overcoat
        [230, 225, 220, 255],  # Cream duster
        [95, 75, 65, 255],     # Brown leather jacket
    ]
    for i, clr in enumerate(long_coats):
        cx = 0.45 + i * 0.16
        coat = box(extents=[0.09, 1.15, 0.46])
        coat.apply_translation([cx, 1.32, 0])
        coat.visual = trimesh.visual.ColorVisuals(mesh=coat, vertex_colors=clr)
        parts.append(coat)
        
    # Shoes on bottom shelf of Right Bay
    for sx in [0.45, 0.72, 0.92]:
        shoe = box(extents=[0.14, 0.08, 0.28])
        shoe.apply_translation([sx, 0.12, 0])
        shoe.visual = trimesh.visual.ColorVisuals(mesh=shoe, vertex_colors=[40, 40, 45, 255])
        parts.append(shoe)
        
    scene = trimesh.Scene(parts)
    return scene

def create_modern_toilet():
    """Generates a sleek contemporary ceramic dual-flush toilet with seat & lid."""
    parts = []
    porcelain = [252, 252, 254, 255]
    chrome = [215, 215, 220, 255]
    
    # 1. Base / Foot
    base = box(extents=[0.38, 0.36, 0.58])
    base.apply_translation([0, 0.18, 0.02])
    base.visual = trimesh.visual.ColorVisuals(mesh=base, vertex_colors=porcelain)
    parts.append(base)
    
    # 2. Toilet Bowl (Curved front cylinder + box blend)
    bowl_front = cylinder(radius=0.19, height=0.38, sections=32)
    bowl_front.apply_translation([0, 0.22, 0.16])
    bowl_front.visual = trimesh.visual.ColorVisuals(mesh=bowl_front, vertex_colors=porcelain)
    parts.append(bowl_front)
    
    # 3. Water Cistern / Tank (Back)
    cistern = box(extents=[0.42, 0.44, 0.22])
    cistern.apply_translation([0, 0.60, -0.20])
    cistern.visual = trimesh.visual.ColorVisuals(mesh=cistern, vertex_colors=porcelain)
    parts.append(cistern)
    
    # Cistern lid
    lid = box(extents=[0.44, 0.04, 0.24])
    lid.apply_translation([0, 0.83, -0.20])
    lid.visual = trimesh.visual.ColorVisuals(mesh=lid, vertex_colors=porcelain)
    parts.append(lid)
    
    # Dual flush chrome button
    btn = cylinder(radius=0.03, height=0.02, sections=24)
    btn.apply_translation([0, 0.855, -0.20])
    btn.visual = trimesh.visual.ColorVisuals(mesh=btn, vertex_colors=chrome)
    parts.append(btn)
    
    # 4. Toilet Seat & Cover Ring
    seat = box(extents=[0.39, 0.04, 0.46])
    seat.apply_translation([0, 0.42, 0.10])
    seat.visual = trimesh.visual.ColorVisuals(mesh=seat, vertex_colors=[245, 245, 248, 255])
    parts.append(seat)
    
    # Chrome hinge details
    for sign in [-1, 1]:
        hinge = cylinder(radius=0.012, height=0.04, sections=16)
        hinge.apply_translation([sign * 0.12, 0.43, -0.09])
        hinge.visual = trimesh.visual.ColorVisuals(mesh=hinge, vertex_colors=chrome)
        parts.append(hinge)
        
    scene = trimesh.Scene(parts)
    return scene

def create_bathroom_vanity():
    """Generates a luxury floating vanity with wood cabinet, ceramic sink, faucet & mirror."""
    parts = []
    wood_color = [205, 175, 135, 255]
    ceramic_white = [252, 252, 254, 255]
    chrome = [215, 220, 225, 255]
    mirror_glass = [230, 240, 245, 255]
    
    # 1. Floating Wood Vanity Cabinet (length 1.2m, depth 0.52m, height 0.48m)
    cabinet = box(extents=[1.20, 0.48, 0.52])
    cabinet.apply_translation([0, 0.52, 0])
    cabinet.visual = trimesh.visual.ColorVisuals(mesh=cabinet, vertex_colors=wood_color)
    parts.append(cabinet)
    
    # Drawer dividing line & 2 drawer faces
    for i, dx in enumerate([-0.30, 0.30]):
        d_face = box(extents=[0.56, 0.44, 0.02])
        d_face.apply_translation([dx, 0.52, 0.265])
        d_face.visual = trimesh.visual.ColorVisuals(mesh=d_face, vertex_colors=[195, 165, 125, 255])
        parts.append(d_face)
        
        # Sleek matte black / chrome handle
        handle = box(extents=[0.24, 0.02, 0.03])
        handle.apply_translation([dx, 0.64, 0.285])
        handle.visual = trimesh.visual.ColorVisuals(mesh=handle, vertex_colors=[40, 40, 45, 255])
        parts.append(handle)
        
    # 2. White Ceramic Countertop (extending slightly)
    countertop = box(extents=[1.22, 0.05, 0.54])
    countertop.apply_translation([0, 0.775, 0])
    countertop.visual = trimesh.visual.ColorVisuals(mesh=countertop, vertex_colors=ceramic_white)
    parts.append(countertop)
    
    # 3. Integrated Vessel Washbasin Sink
    sink_rim = box(extents=[0.56, 0.12, 0.38])
    sink_rim.apply_translation([0, 0.84, 0.02])
    sink_rim.visual = trimesh.visual.ColorVisuals(mesh=sink_rim, vertex_colors=ceramic_white)
    parts.append(sink_rim)
    
    # Sink inner basin recess
    sink_inner = box(extents=[0.48, 0.02, 0.30])
    sink_inner.apply_translation([0, 0.88, 0.02])
    sink_inner.visual = trimesh.visual.ColorVisuals(mesh=sink_inner, vertex_colors=[235, 240, 245, 255])
    parts.append(sink_inner)
    
    # Chrome Pop-up drain
    drain = cylinder(radius=0.03, height=0.015, sections=24)
    drain.apply_translation([0, 0.89, 0.02])
    drain.visual = trimesh.visual.ColorVisuals(mesh=drain, vertex_colors=chrome)
    parts.append(drain)
    
    # 4. Modern Tall Chrome Mixer Faucet
    faucet_base = cylinder(radius=0.02, height=0.22, sections=16)
    faucet_base.apply_translation([0, 0.90, -0.12])
    faucet_base.visual = trimesh.visual.ColorVisuals(mesh=faucet_base, vertex_colors=chrome)
    parts.append(faucet_base)
    
    faucet_spout = cylinder(radius=0.014, height=0.16, sections=16)
    faucet_spout.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [1, 0, 0]))
    faucet_spout.apply_translation([0, 1.01, -0.04])
    faucet_spout.visual = trimesh.visual.ColorVisuals(mesh=faucet_spout, vertex_colors=chrome)
    parts.append(faucet_spout)
    
    # Single-lever handle
    lever = box(extents=[0.015, 0.08, 0.02])
    lever.apply_translation([0, 1.02, -0.12])
    lever.visual = trimesh.visual.ColorVisuals(mesh=lever, vertex_colors=chrome)
    parts.append(lever)
    
    # 5. Accessories on Vanity Counter
    # Soap dispenser
    soap = cylinder(radius=0.035, height=0.14, sections=16)
    soap.apply_translation([0.38, 0.86, -0.06])
    soap.visual = trimesh.visual.ColorVisuals(mesh=soap, vertex_colors=[240, 235, 225, 255])
    parts.append(soap)
    
    pump = cylinder(radius=0.008, height=0.05, sections=12)
    pump.apply_translation([0.38, 0.94, -0.06])
    pump.visual = trimesh.visual.ColorVisuals(mesh=pump, vertex_colors=chrome)
    parts.append(pump)
    
    # Tumbler / Glass
    glass_cup = cylinder(radius=0.035, height=0.11, sections=16)
    glass_cup.apply_translation([-0.38, 0.84, -0.06])
    glass_cup.visual = trimesh.visual.ColorVisuals(mesh=glass_cup, vertex_colors=[210, 225, 235, 220])
    parts.append(glass_cup)
    
    # 6. Large Architectural Frameless LED Mirror (mounted above sink)
    mirror_back = box(extents=[1.05, 0.85, 0.02])
    mirror_back.apply_translation([0, 1.55, -0.23])
    mirror_back.visual = trimesh.visual.ColorVisuals(mesh=mirror_back, vertex_colors=[255, 255, 240, 255]) # Backlit warm glow
    parts.append(mirror_back)
    
    mirror_front = box(extents=[1.00, 0.80, 0.01])
    mirror_front.apply_translation([0, 1.55, -0.215])
    mirror_front.visual = trimesh.visual.ColorVisuals(mesh=mirror_front, vertex_colors=mirror_glass)
    parts.append(mirror_front)
    
    scene = trimesh.Scene(parts)
    return scene

def create_shower_enclosure():
    """Generates the transparent glass walk-in shower enclosure with chrome column & rain head."""
    parts = []
    chrome = [215, 220, 225, 255]
    glass_color = [220, 238, 248, 120] # High transparency light cyan glass
    tray_color = [240, 244, 248, 255]
    
    # 1. Shower Floor Tray (1.2m x 1.0m, low step 0.04m for elderly safety)
    tray = box(extents=[1.20, 0.04, 1.00])
    tray.apply_translation([0, 0.02, 0])
    tray.visual = trimesh.visual.ColorVisuals(mesh=tray, vertex_colors=tray_color)
    parts.append(tray)
    
    # Stainless linear drain grate
    drain = box(extents=[0.60, 0.005, 0.07])
    drain.apply_translation([0, 0.042, -0.35])
    drain.visual = trimesh.visual.ColorVisuals(mesh=drain, vertex_colors=chrome)
    parts.append(drain)
    
    # 2. Tempered Glass Partition Screen (Height 2.05m, width 1.0m, thickness 0.01m)
    glass_panel = box(extents=[0.01, 2.05, 1.00])
    glass_panel.apply_translation([-0.59, 1.06, 0])
    glass_panel.visual = trimesh.visual.ColorVisuals(mesh=glass_panel, vertex_colors=glass_color)
    parts.append(glass_panel)
    
    # Chrome floor channel & wall brackets for glass
    channel = box(extents=[0.025, 0.03, 1.00])
    channel.apply_translation([-0.59, 0.05, 0])
    channel.visual = trimesh.visual.ColorVisuals(mesh=channel, vertex_colors=chrome)
    parts.append(channel)
    
    # Top stabilizer bar (connecting glass top to back wall)
    stabilizer = cylinder(radius=0.012, height=0.58, sections=16)
    stabilizer.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [1, 0, 0]))
    stabilizer.apply_translation([-0.59, 2.05, -0.20])
    stabilizer.visual = trimesh.visual.ColorVisuals(mesh=stabilizer, vertex_colors=chrome)
    parts.append(stabilizer)
    
    # 3. Chrome Shower Column System (on back wall)
    # Vertical rail
    rail = cylinder(radius=0.015, height=1.30, sections=16)
    rail.apply_translation([0, 1.45, -0.46])
    rail.visual = trimesh.visual.ColorVisuals(mesh=rail, vertex_colors=chrome)
    parts.append(rail)
    
    # Top extension arm for rain shower head
    arm = cylinder(radius=0.015, height=0.38, sections=16)
    arm.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [1, 0, 0]))
    arm.apply_translation([0, 2.10, -0.28])
    arm.visual = trimesh.visual.ColorVisuals(mesh=arm, vertex_colors=chrome)
    parts.append(arm)
    
    # Rain shower head disc (diameter 24cm)
    head = cylinder(radius=0.12, height=0.02, sections=32)
    head.apply_translation([0, 2.08, -0.10])
    head.visual = trimesh.visual.ColorVisuals(mesh=head, vertex_colors=chrome)
    parts.append(head)
    
    # Thermostatic mixer valve plate & handles
    mixer_plate = box(extents=[0.14, 0.28, 0.02])
    mixer_plate.apply_translation([0, 1.05, -0.47])
    mixer_plate.visual = trimesh.visual.ColorVisuals(mesh=mixer_plate, vertex_colors=chrome)
    parts.append(mixer_plate)
    
    for ky in [0.98, 1.12]:
        knob = cylinder(radius=0.025, height=0.04, sections=16)
        knob.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [1, 0, 0]))
        knob.apply_translation([0, ky, -0.44])
        knob.visual = trimesh.visual.ColorVisuals(mesh=knob, vertex_colors=chrome)
        parts.append(knob)
        
    # Handheld shower wand & holder
    wand_holder = box(extents=[0.04, 0.04, 0.06])
    wand_holder.apply_translation([0.14, 1.35, -0.45])
    wand_holder.visual = trimesh.visual.ColorVisuals(mesh=wand_holder, vertex_colors=chrome)
    parts.append(wand_holder)
    
    wand = cylinder(radius=0.014, height=0.22, sections=16)
    wand.apply_translation([0.14, 1.42, -0.42])
    wand.visual = trimesh.visual.ColorVisuals(mesh=wand, vertex_colors=chrome)
    parts.append(wand)
    
    scene = trimesh.Scene(parts)
    return scene

def create_safety_grab_bar():
    """Generates an ADA / Senior certified 32mm stainless steel grab bar."""
    parts = []
    chrome = [225, 225, 230, 255]
    
    # Main horizontal bar (length 0.60m)
    bar = cylinder(radius=0.016, height=0.54, sections=24)
    bar.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [0, 0, 1]))
    bar.apply_translation([0, 0, 0.05])
    bar.visual = trimesh.visual.ColorVisuals(mesh=bar, vertex_colors=chrome)
    parts.append(bar)
    
    # 2 Wall Stems (connecting to wall)
    for sign in [-1, 1]:
        stem = cylinder(radius=0.016, height=0.06, sections=16)
        stem.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [1, 0, 0]))
        stem.apply_translation([sign * 0.27, 0, 0.025])
        stem.visual = trimesh.visual.ColorVisuals(mesh=stem, vertex_colors=chrome)
        parts.append(stem)
        
        # Wall mounting rosette flange disc
        flange = cylinder(radius=0.038, height=0.012, sections=24)
        flange.apply_transform(trimesh.transformations.rotation_matrix(np.radians(90), [1, 0, 0]))
        flange.apply_translation([sign * 0.27, 0, 0.006])
        flange.visual = trimesh.visual.ColorVisuals(mesh=flange, vertex_colors=chrome)
        parts.append(flange)
        
    scene = trimesh.Scene(parts)
    return scene

def create_framed_wall_art():
    """Generates modern architectural framed prints above bed matching the reference image."""
    parts = []
    wood_frame = [190, 160, 125, 255]
    matting_white = [248, 248, 250, 255]
    art_print_1 = [220, 205, 190, 255]
    art_print_2 = [195, 185, 175, 255]
    
    # 2 Frames side by side
    for i, sign in enumerate([-1, 1]):
        fx = sign * 0.38
        # Outer wooden frame
        frame = box(extents=[0.54, 0.72, 0.025])
        frame.apply_translation([fx, 0, 0])
        frame.visual = trimesh.visual.ColorVisuals(mesh=frame, vertex_colors=wood_frame)
        parts.append(frame)
        
        # Inner white passe-partout / matting
        mat = box(extents=[0.48, 0.66, 0.026])
        mat.apply_translation([fx, 0, 0.002])
        mat.visual = trimesh.visual.ColorVisuals(mesh=mat, vertex_colors=matting_white)
        parts.append(mat)
        
        # Central art poster
        art_color = art_print_1 if sign < 0 else art_print_2
        art = box(extents=[0.36, 0.50, 0.027])
        art.apply_translation([fx, 0, 0.004])
        art.visual = trimesh.visual.ColorVisuals(mesh=art, vertex_colors=art_color)
        parts.append(art)
        
    scene = trimesh.Scene(parts)
    return scene

def main():
    print("Generating photorealistic furniture GLBs...")
    
    generators = [
        ("public/models/bedroom/double_bed_photoreal.glb", create_double_bed),
        ("public/models/wardrobe/walkin_closet_system.glb", create_walkin_wardrobe),
        ("public/models/bathroom/toilet_modern.glb", create_modern_toilet),
        ("public/models/bathroom/bathroom_vanity.glb", create_bathroom_vanity),
        ("public/models/bathroom/shower_enclosure.glb", create_shower_enclosure),
        ("public/models/decoration/framed_wall_art.glb", create_framed_wall_art),
        ("public/models/safety/safety_grab_bar.glb", create_safety_grab_bar),
    ]
    
    for path, gen_fn in generators:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        scene = gen_fn()
        scene.export(path)
        size_kb = os.path.getsize(path) / 1024
        print(f"✓ Generated {path} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
