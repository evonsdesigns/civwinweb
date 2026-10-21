from PIL import Image

img = Image.open('src/assets/v4/SPR.png')

for i in range(28):
    x = (i % 20) * 32
    y = 320 + (i // 20) * 32
    c = img.crop((x, y, x+32, y+32))
    c.save(f'dev_unit_{i:02d}.png')

