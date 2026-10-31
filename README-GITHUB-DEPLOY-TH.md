# Smart Fleet — Deploy ผ่าน GitHub

ชุดนี้คือ Smart Fleet v3.8.1 พร้อม UI ที่อนุมัติ และซ่อนแถบ Production แล้ว
เป็นโค้ดแอปฉบับเต็มสำหรับสร้าง repository ใหม่ ไม่ใช่เฉพาะ workflow
หากเว็บจริงใช้ v3.9 หรือมีรูปเลขไมล์/ค่าใช้จ่ายแล้ว อย่าใช้ชุด v3.8 นี้ทับ ให้ย้าย workflow ไปใช้กับซอร์สเวอร์ชันนั้นและปรับการตรวจหน้าเข้าสู่ระบบตาม UI แทน

## สิ่งที่ทำได้และสถานะ

กด Actions → Deploy Smart Fleet → Run workflow แล้วเลือก demo หรือ production
ไม่มีการ Deploy เพียงเพราะกด Push; ต้องเลือก Run workflow เอง
ตรวจ Build, TypeScript และชุดทดสอบก่อน Deploy
ตรวจชื่อ Worker และ D1 binding เดิมผ่าน Cloudflare ก่อนอัปเดต ปฏิเสธหากไม่ตรง
ใช้ --keep-vars และไม่เปลี่ยน APP_PASSWORD ไม่รัน SQL ไม่สร้างฐาน ไม่ลบหรือนำเข้าข้อมูล
การแยกข้อมูล Demo/Production ยังทำงานตามเดิม
การตรวจหลัง Deploy ตรวจได้เฉพาะหน้าเข้าสู่ระบบ คุณต้องล็อกอินตรวจรายการจริงด้วย
ยังไม่ได้สร้าง repository หรือตั้ง Secrets ในบัญชีคุณ และยังไม่ได้ Deploy จาก GitHub จริง

## 1. เตรียมบัญชี

ต้องมีบัญชี GitHub และต้องเข้าสู่บัญชี Cloudflare เดิมได้เพื่อสร้าง API Token หนึ่งครั้ง
GitHub ช่วยให้ Deploy จากระบบของ GitHub แทนเครื่องมือในแชต แต่ไม่สามารถข้ามการเข้าถึงบัญชี Cloudflare ได้
หากยังเข้า Cloudflare ไม่ได้ ให้กู้บัญชีให้เรียบร้อยก่อน

## 2. สร้าง repository ด้วย GitHub Desktop

1. แตก ZIP นี้ไว้ชั่วคราว
2. ใน GitHub Desktop ลงชื่อเข้า GitHub ของคุณ เลือก File → New repository
3. ตั้ง Name เป็น smart-fleet และเลือก Local path ที่ต้องการ เช่น D:\Projects จะได้โฟลเดอร์ D:\Projects\smart-fleet
4. คัดลอกไฟล์ใน ZIP ทั้งหมดลงโฟลเดอร์ repository รวมโฟลเดอร์ .github และไฟล์ .gitignore
5. เปิดโฟลเดอร์แล้วต้องเห็น package.json, build.mjs, src, scripts และ .github อยู่ระดับเดียวกัน ห้ามมีโฟลเดอร์ source หรือ ZIP ครอบอีกชั้น
6. กลับ GitHub Desktop พิมพ์ Summary ว่า Setup Smart Fleet deployment → Commit to main
7. กด Publish repository และติ๊ก Keep this code private → Publish repository

อย่านำ node_modules, ไฟล์สำรองข้อมูล, .env หรือรหัสผ่านใส่ repository

## 3. สร้างสิทธิ์ Cloudflare

1. เข้าสู่ Cloudflare บัญชีเดียวกับ Worker smart-fleet และ smart-fleet-demo
2. ไปหน้า Account API tokens → Create Token → เลือก template Edit Cloudflare Workers
3. ตั้งชื่อ Smart Fleet GitHub Deploy และจำกัด Account resources ให้เฉพาะบัญชี Smart Fleet
4. ให้มีสิทธิ์แก้ไข Worker และอ่าน settings ของ Worker เดิมทั้งสองตัว (Workers Editor หรือชื่อเดิม Workers Scripts Edit ตามหน้าจอ)
5. ใช้ URL workers.dev เดิม ไม่ต้องเพิ่ม zone หรือ custom-domain permissions สำหรับชุดนี้
6. สร้าง Token แล้วเก็บไว้เพื่อใส่ GitHub Secret โดยตรง ไม่ส่งเข้าแชต ไม่เขียนในโค้ด

workflow นี้อ่าน Worker settings และ deploy เท่านั้น ไม่อ่านแถวข้อมูล D1 จึงไม่ต้องให้สิทธิ์แก้ข้อมูล D1 เพื่อรัน SQL
ดู Account ID ได้จากหน้าบัญชี Cloudflare หรือ Overview ของ Worker
ดู Database ID ของฐาน smart-fleet-demo จาก Storage & databases → D1 → smart-fleet-demo → Overview
ห้ามใช้ ID ของฐาน Production แทน Demo

## 4. ใส่ค่าบน GitHub

เปิด repository → Settings → Secrets and variables → Actions
ในแท็บ Secrets กด New repository secret ทีละรายการ:

| Name | ค่า |
| --- | --- |
| CLOUDFLARE_API_TOKEN | Token ที่เพิ่งสร้างใน Cloudflare |
| CLOUDFLARE_ACCOUNT_ID | Account ID ของบัญชี Smart Fleet |

ในแท็บ Variables กด New repository variable:

| Name | ค่า |
| --- | --- |
| DEMO_DATABASE_ID | Database ID ของ D1 smart-fleet-demo ที่ใช้อยู่จริง |

ไม่ต้องนำ APP_PASSWORD มาใส่ใน GitHub เพราะใช้ Secret เดิมบน Worker
ฐาน Production ในชุดนี้กำหนดเป็น smart-fleet-production / ebbca318-17d1-4486-b925-d6c787472ba5 หากฐานจริงของคุณต่างจากนี้ต้องแก้ wrangler.production.jsonc ก่อน
Demo ใช้ binding DEMO_DB และ Production ใช้ binding DB ตามการตั้งค่าเดิม

## 5. ทดลอง Deploy Demo

1. ดาวน์โหลดไฟล์สำรองจากแอป Demo และเก็บโค้ด/เวอร์ชัน Worker เดิมไว้ก่อน
2. บน GitHub เปิด Actions → Deploy Smart Fleet → Run workflow
3. เลือก Branch main และ target เป็น demo → Run workflow
4. เปิดรายการที่กำลังทำงาน รอทุกขั้นตอนเป็นสีเขียว
5. เปิด https://smart-fleet-demo.kritsuwan1.workers.dev แล้วรีเฟรช ตรวจแถบ DEMO ล็อกอิน จำนวนรายการ การ์ดรอคืนรถ และเปิดฟอร์มคืนรถ

ปุ่ม Run workflow จะปรากฏเมื่อไฟล์ .github/workflows/deploy.yml อยู่บน default branch และเปิดใช้งาน Actions แล้ว
หากหน้าจอขอเปิด Actions ให้กดเปิดใช้งานสำหรับ repository นี้

## 6. อัปเดต Production

เมื่อ Demo ผ่าน ให้สำรองข้อมูลจริงและจดเวอร์ชัน Worker เดิมไว้
ไป Actions → Deploy Smart Fleet → Run workflow → target production → Run workflow
ตรวจ workflow เป็นสีเขียว แล้วเปิด https://smart-fleet.kritsuwan1.workers.dev
ล็อกอิน ตรวจจำนวนรถ/รายการ ข้อมูลเลขไมล์ และการแสดงผล แถบ Production จะถูกซ่อน
ไม่มีการคัดลอกข้อมูลจาก Demo ไป Production; แต่ละฝั่งใช้ฐานเดิม

## อัปเดตครั้งต่อไป

นำไฟล์ซอร์สรุ่นใหม่มาแทนไฟล์เดิมใน repository โดยเก็บ .github/workflows/deploy.yml, scripts/prepare-deploy.mjs, scripts/check-deployment.mjs และ .gitignore ไว้
Commit → Push origin → Run workflow ฝั่ง demo → ตรวจผล → Run workflow ฝั่ง production
อย่าเอาไฟล์ Worker ที่ build แล้วไปแทน src; workflow จะ build จาก src เสมอ
ถ้าโครงสร้างไฟล์หรือ UI เปลี่ยน ต้องปรับ workflow/check-deployment ให้เหมาะกับรุ่นใหม่

## หากเกิดข้อผิดพลาด

- Secrets missing: ตรวจชื่อ Secrets ให้ตรงทุกตัวอักษร
- Cannot read existing Worker: ตรวจ Account ID, Token, สิทธิ์และชื่อ Worker
- D1 binding does not match: ตรวจ Demo Database ID และ binding ที่ Cloudflare; ระบบยังไม่ deploy ในกรณีนี้
- Build/test failed: ยังไม่ Deploy ให้แก้ข้อผิดพลาดในขั้นตอนสีแดงก่อน
- Login page check failed: อาจ Deploy สำเร็จแล้วแต่ตรวจหน้าเว็บไม่ผ่าน ให้ตรวจ Cloudflare Deployments และ logs; workflow ไม่ rollback อัตโนมัติ
- หน้าจอยังเดิม: ลองรีเฟรชหรือเปิดหน้าต่างไม่ระบุตัวตน ตรวจว่าเลือก target ถูกฝั่ง
- ต้องย้อน UI: ไป Cloudflare → Worker ของฝั่งนั้น → Deployments → เลือกเวอร์ชันเดิม → Rollback ไม่คืนข้อมูล D1 ย้อนเวลา

เก็บข้อมูลสำรองไว้ส่วนตัว อย่าแนบข้อมูลสำรองฐานจริงลง repository หรือ Actions artifacts

## เอกสารอ้างอิง

- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- https://developers.cloudflare.com/workers/authorization/workers/
- https://developers.cloudflare.com/workers/wrangler/commands/workers/
- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
