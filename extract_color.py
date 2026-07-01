from tkinter import Tk, colorchooser, filedialog, simpledialog

import numpy as np
from PIL import Image

root = Tk()
root.withdraw()

image_path = filedialog.askopenfilename(
    title="Select an image",
    filetypes=[("Image Files", "*.png *.jpg *.jpeg *.bmp *.webp")],
)

if not image_path:
    print("No image selected.")
    exit()

hex_color = colorchooser.askcolor(title="Pick a color")[1]

if not hex_color:
    print("No color selected.")
    exit()

tolerance = simpledialog.askinteger(
    "Tolerance", "Enter tolerance (0-255):", initialvalue=30, minvalue=0, maxvalue=255
)

if tolerance is None:
    print("No tolerance selected.")
    exit()

img = Image.open(image_path).convert("RGBA")
arr = np.array(img)

target = np.array(
    [int(hex_color[1:3], 16), int(hex_color[3:5], 16), int(hex_color[5:7], 16)]
)

rgb = arr[:, :, :3]

distance = np.linalg.norm(rgb.astype(np.int16) - target, axis=2)

mask = distance <= tolerance

result = np.zeros_like(arr)
result[mask] = arr[mask]

output = Image.fromarray(result)

save_path = filedialog.asksaveasfilename(
    title="Save extracted image", defaultextension=".png", filetypes=[("PNG", "*.png")]
)

if save_path:
    output.save(save_path)
    print(f"Saved to {save_path}")
else:
    print("Save cancelled.")
