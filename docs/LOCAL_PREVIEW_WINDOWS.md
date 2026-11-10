# Safe Local Preview สำหรับ Windows

## Policy v1.2 — current signup flow

NEW signup creates its own active Person atomically and goes straight to Dashboard: register → Thai success → checkout → own return → own history/personal reports/basic reminders. No manual Admin linking for new signup. Logout/login preserves rights. Existing preview.unlinked is intentionally historical v3 and still restricted; Admin may test its exact-ID first-link workflow separately with preview-person-2. preview.user is historical Admin-linked v4. Neither fixture is auto-converted. Instructions below requiring all new signup users to be linked are superseded by this section. Loopback/RAM-only/network-denial/credentials/commands remain unchanged. [Current contract](AUTOMATIC_PERSON_V1_2.md).

สำหรับ dev/smartfleet-batch-1 เท่านั้น ใช้ Node.js24 และ npm ที่ติดตั้งอยู่แล้ว ไม่ต้อง login Cloudflare, ไม่ต้องสร้าง .env/Secrets, ไม่ต้องใช้ Wrangler หรือ D1 จริง

## เปิดจาก D:\smart-fleet

เปิด PowerShell แล้วใช้คำสั่ง:

```powershell
Set-Location D:\smart-fleet
git status --short
git branch --show-current
git pull --ff-only origin dev/smartfleet-batch-1
node --version
npm ci
npm run preview:local
```

ต้องอยู่ branch dev/smartfleet-batch-1 และไม่มีงานที่ยังไม่ได้บันทึกก่อน pull หากไม่ตรงให้หยุดตรวจ branch/งานค้างก่อน ไม่ใช้ reset --hard, merge main หรือเขียนทับไฟล์ค้าง คำสั่ง pull ดึงเฉพาะ Development; ไม่ Deploy

preview:local เรียก npm run build แล้วเปิด Node HTTP server ที่ **http://127.0.0.1:8787** เท่านั้น รอข้อความ LOCAL PREVIEW และ URL ก่อนเปิด Microsoft Edge ใช้ InPrivate เพื่อแยกบัญชี/แท็บทดสอบ ระบบทำงานต่อจนกด **Ctrl+C** ในหน้าต่าง terminal นี้ หากถาม Terminate batch job (Y/N)? ให้ตอบ Y อย่าปิด terminal หากยังทดสอบอยู่

ถ้าติดตั้ง dependencies และ build ผ่านแล้ว สามารถเรียก npm run preview:local ได้เลย script จะ build ให้ตรง source อีกครั้ง ไม่มี hot reload; เมื่อแก้ source ให้หยุดแล้วเริ่ม process ใหม่

## บัญชีจำลองที่เผยแพร่ไว้สำหรับ preview เท่านั้น

| บทบาท | Username | Password | สถานะเริ่มต้น |
| --- | --- | --- | --- |
| Admin | admin | PreviewAdmin123! | จัดการข้อมูลจำลอง |
| Employee เดิมจำลอง | preview.employee | PreviewEmployee123! | legacy Employee ที่ผูก preview-person-3; ใช้ทดสอบสิทธิ์เดิม |
| User ที่ผูก Person แล้ว | preview.user | PreviewUser123! | preview-person-1; ใช้รถและดูประวัติของตนได้ |
| User ที่ยังไม่ผูก | preview.unlinked | PreviewUser123! | เข้าบัญชีได้ทันที แต่ใช้รถ/ดูประวัติไม่ได้จน Admin ผูก Person |

ทั้งหมดเป็นค่าทดสอบสาธารณะ ไม่ใช่ credentials ของ Production/Demo/Cloudflare ห้ามนำไปใช้กับระบบจริงหรือป้อนรหัสจริงลง preview ไม่มี Staff activation หรือการเปลี่ยนบัญชีจริง

## ลอง flow แบบ manual

1. เปิด Admin ใน Edge ปกติ และ User ใน InPrivate เพื่อไม่ให้ session cookie แทนกัน เปิด URL127.0.0.1เดียวกัน ไม่ใช้ workers.dev, LAN IP หรือ localhost แทน
2. ลอง preview.user: มีรถ LOCAL-001/LOCAL-002 และประวัติจำลองหนึ่งรายการ รายงาน/ประวัติจำกัด ownerUserId เช่นเดิม รถคันแรกมีเลขไมล์ล่าสุด110 เลือกบันทึกใช้รถ กรอกโครงการ/สถานที่จำลอง ตรวจวันเวลาและเลขไมล์ แล้วคืนรถด้วยเลขไมล์ที่ไม่น้อยกว่าตอนออก ดู original success confirmation และประวัติ
3. ลอง signup ผู้ใช้ใหม่ด้วยชื่อ/username ทดสอบไม่ซ้ำและ password อย่างน้อย6ตัว ระบบสร้าง Person ใหม่เฉพาะบัญชีแบบ atomic แล้วเข้า Dashboard พร้อมข้อความ “สมัครสำเร็จ พร้อมใช้งานรถ” ใช้รถได้ทันที ไม่มีคิวอนุมัติหรือขั้นตอนผูก Person โดย Admin
4. แยกทดสอบบัญชีเก่า preview.unlinked: ยังใช้รถไม่ได้ ฝั่ง Admin เข้า จัดการข้อมูล → บัญชีพนักงาน → ยืนยันและผูก Person ID เลือก exact account และ preview-person-2 ที่ยังไม่ถูกใช้ (preview-person-3 ใช้กับ Employee จำลอง) ตรวจ ID และ checkbox ยืนยัน กดผูก จากนั้นบัญชีเก่า login ใหม่ Session เดิมถูกยกเลิก ไม่จับคู่ชื่อ ไม่ auto-convert และไม่รองรับ relink ขั้นตอนนี้ไม่จำเป็นสำหรับ signup ใหม่ v1.2
5. ทดสอบ User สมัครใหม่รับ–คืนรถ ดูประวัติและรายงานส่วนบุคคล กด PDF/Excel ได้ Logout/login แล้วยังมีสิทธิ์เดิม ฟอนต์ PDF ฝังใน Worker ไม่เรียกบริการภายนอก User ได้เฉพาะแจ้งเตือนบำรุงรักษาเบื้องต้น ไม่มีค่าใช้จ่ายหรือประวัติผู้อื่น
6. ฝั่ง Admin เปิด dashboard บำรุงรักษารถยนต์ มีแผนเปลี่ยนน้ำมันเครื่องจำลองให้ลองแก้แผน/บันทึกงานที่เสร็จ/ดูประวัติ ใช้เฉพาะตัวเลข วันที่ รายละเอียด และค่าใช้จ่ายจำลอง เลขไมล์/วันต้องผ่าน validation เดิม
7. ทดสอบ network timeout/reload ได้โดยใช้ขั้นตอนเดิมของ SESSION_PERSON_RECOVERY; ถ้าเกิด unknown ต้องหยุดส่งซ้ำและใช้ read-only check ที่มีอยู่ ห้ามล้าง marker, สร้าง ID ใหม่ หรือใช้ preview เป็น manual unlock/reset ไม่มี Admin ledger search เพิ่มในงานนี้

ข้อมูล SQLite อยู่ใน RAM ของ process เดียว Refresh ยังเห็นข้อมูลเดิมใน process นั้น Ctrl+C/หยุด process ทำให้ข้อมูลทดสอบทั้งหมดหาย ไม่มีไฟล์ฐานที่ disk และไม่มีการนำเข้าข้อมูลเดิม Process ใหม่ได้ fixture และ sessionKey ใหม่ คุกกี้เก่าจะใช้ไม่ได้ แท็บเดิมอาจมี blocked recovery marker ตามกฎเดิม สำหรับ **รอบ fixture จำลองใหม่** ให้เริ่ม browser session ทดสอบที่แยกใหม่ อย่าอ้างว่าการ restart/เปิดแท็บใหม่แก้ unknown transaction ของรอบก่อนหรือระบบจริง

## การแยกจากระบบจริง

- ใช้เฉพาะ output/worker-staging.js จาก build ในเครื่อง กับ D1-shaped adapter จาก synthetic Worker/SQLite browser tests ใน :memory: ไม่อ่าน wrangler.jsonc, .env, Cloudflare credentials, Production database IDs หรือ database file ที่ผู้ใช้กำหนด
- Local script สร้างตารางเฉพาะใน SQLite RAM ใหม่ ไม่เรียก schema*.sql, migration, Wrangler, D1 initialization script หรือ Cloudflare API ไม่มี R2 binding, notification secret, scheduled event หรือ Cron ที่เรียกทำงาน
- Bind IPv4 127.0.0.1 เท่านั้น ปฏิเสธ Host/Origin แปลกและ cross-site request ไม่มี host override, LAN binding, tunnel หรือ remote deploy. Port8787ชนกันจะหยุดพร้อมข้อความ ไม่เปลี่ยนไปเปิด host/port อื่นอัตโนมัติ
- Server preview ปิด fetch/WebSocket ออกเครือข่ายของ process และใช้ CSP เฉพาะ self ฝั่ง browser พร้อมตัด external font links. ราคาเชื้อเพลิงอัตโนมัติภายนอกจึง unavailable; Admin ใช้ราคาอ้างอิงที่กรอกเป็นข้อมูลจำลองได้ ไม่มีการอ่าน network config/secret จริง
- QR, backup endpoints และ import/importExcel ถูกปิดเฉพาะ local bridge เพื่อกัน public links/ไฟล์จริง ไม่เพิ่ม restore/reset หรือ Admin ledger lookup รักษา auth, Secure/HttpOnly/SameSite cookie, role/link guard, validation, CAS และ operation ledger ของแอปเดิม
- นี่เป็น trusted local development harness ไม่ใช่ OS firewall หรือ server สำหรับ LAN/public hosting ไม่ใส่ข้อมูลรถ/บุคคล/เอกสาร/credential จริง และไม่แชร์พอร์ตออกเครือข่าย

## แก้ปัญหาทั่วไป

| อาการ | ตรวจอะไร |
| --- | --- |
| Missing script: preview:local | ยังไม่ได้ดึง commit นี้ หรือเปิดคนละโฟลเดอร์ ตรวจ branch/path แล้ว pull แบบ ff-only |
| Node version ไม่ตรง / node:sqlite ไม่พร้อม | ใช้ Node.js24 และรัน npm ci ใหม่ในโฟลเดอร์นี้ |
| พอร์ต8787ถูกใช้อยู่ | กลับ terminal preview เดิมแล้ว Ctrl+C; ไม่ kill process ที่ไม่รู้จัก ไม่เปิดพอร์ตอื่น/LAN |
| 403 Host/Origin | เปิด http://127.0.0.1:8787 โดยตรง ไม่มี proxy/host override ไม่ใช้ localhost หรือ IP เครื่อง |
| Login ไม่ผ่าน/ข้อมูลเก่าหายหลังเริ่มใหม่ | ใช้บัญชีจำลองข้างต้นในรอบทดสอบใหม่ ไม่ใช้ credential จริง ตรวจว่าเปิด process และ URL ที่ถูกต้อง |
| User ใหม่ใช้รถไม่ได้ | ตรวจว่า build/source เป็น Policy v1.2 และเปิด process ใหม่พร้อมข้อมูลจำลอง; บัญชี preview.unlinked เป็น v3 เก่าที่ตั้งใจจำกัดสิทธิ์ ห้าม auto-link หรือ reset รายการไม่ทราบผล |
| User ไม่ปรากฏในรายชื่อ Admin | รีเฟรชข้อมูล Admin หลัง signup ก่อนเปิดหน้า Person linking |
| 429 ลอง login มากเกินไป | rate limit เดิมยังทำงาน รอรอบเวลาที่แอประบุ ไม่ปิด security guard |
| ราคาอัตโนมัติ/QR/import/backup unavailable | เป็นข้อจำกัด preview ที่ตั้งใจไว้ ไม่ใช้ production config เพื่อแก้ |
| SQL checker test ไม่ผ่านเพราะ fixture CRLF | ใช้ commit ล่าสุดที่เทียบ frozen guard แบบ LF/CRLF แล้ว ไม่แก้ hash/guard หรือลดข้อจำกัด SQL เอง |
| Unknown/blocked recovery | หยุดส่งซ้ำ อ่าน SESSION_PERSON_RECOVERY/MANUAL_UNKNOWN_OPERATION_RECOVERY ไม่มี unlock/reset ใน preview |

## การตรวจสอบ

คำสั่งมาตรฐาน: npm run build, npm run typecheck, npm test (เพิ่ม preview-local.test.mjs เป็น suite30). Optional local Edge acceptance ใช้ node tests/preview-local-browser.mjs PATH_TO_PLAYWRIGHT PATH_TO_EDGE เมื่อมี Playwright สำหรับ QA อยู่แล้ว ไม่เป็น prerequisite สำหรับผู้ใช้เปิด preview

Local preview guard tests ครอบคลุม loopback/Host/Origin/CSP, synthetic auth/isolation, secure cookie, import/unsafe route refusal, UTF-8, outbound fetch/WebSocket denial และ port conflict. Browser acceptance ใช้ actual Worker/cookies และข้อมูลจำลองเพื่อทดสอบ signup/login/Person linking/checkout/return/own history/PDF/Maintenance ที่ desktop/360/390 ไม่ถือเป็นการปิด Task3D.5 หรือยืนยันอุปกรณ์มือถือจริง ผลจริงอยู่ใน PROGRESS; Windows D-drive และ Linux ผ่านครบ30 suites หลังแก้ CRLF checker, preview guard28 cases และ local browser acceptance PASS

**Task3D.4D-6 = SKIPPED ตาม owner instruction; Task3D.5 แยกต่างหาก** Operator/Live/Initialize/Deployment ยังคง DEFERRED ไม่มีการเปิด Cloudflare resources, deploy, merge, initialize ฐานจริง, migration หรือเปลี่ยน Production/Demo
