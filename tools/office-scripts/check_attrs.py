from pptx import Presentation
prs = Presentation(r"D:\cupt作品赛\答辩PPT_环形喷泉_附录版.pptx")
print(type(prs))
print(type(prs.part))
# Check what attributes are available
print([a for a in dir(prs.part) if not a.startswith('_')])
print([a for a in dir(prs.part) if 'element' in a.lower() or 'pres' in a.lower()])
# Try common paths
try:
    print("prs._element:", type(prs._element))
except:
    print("prs._element: FAIL")
try:
    print("prs.part.element:", type(prs.part.element))
except Exception as e:
    print(f"prs.part.element: {e}")
try:
    print("prs.part.presentation_element:", type(prs.part.presentation_element))
except Exception as e:
    print(f"prs.part.presentation_element: {e}")
