# Task 3D.4D-5 — Manual Unknown-Operation Recovery & Support Design

วันที่ 2026-11-10 Asia/Bangkok · kritsuwan1/smart-fleet · dev/smartfleet-batch-1

**DESIGN COMPLETE / IMPLEMENTATION NOT_APPROVED / OPERATIONAL RECOVERY NOT_READY.** เอกสารนี้ออกแบบขั้นตอนช่วยเหลือ ไม่ได้เปิด reset/unlock, เพิ่ม endpoint, เปลี่ยนสิทธิ์ หรืออนุมัติให้ตรวจฐานจริง ห้ามใช้เป็นคำสั่งให้แก้ sessionStorage, สร้าง operation ID ใหม่, ส่งธุรกรรมซ้ำ หรือลบ ledger

## 1. หลักฐานและขอบเขตที่ตรวจจริง

ตรวจ implementation [b920532040873b9e2f8dfc904fd505f1da4adbaa](https://github.com/kritsuwan1/smart-fleet/commit/b920532040873b9e2f8dfc904fd505f1da4adbaa), docs-only follow-up [d872b7d72c839327800e0908f81821ef1a0607a4](https://github.com/kritsuwan1/smart-fleet/commit/d872b7d72c839327800e0908f81821ef1a0607a4) ซึ่งแก้ 3 docs และ exact Linux CI [42793628897](https://github.com/kritsuwan1/smart-fleet/actions/runs/42793628897), job129753062809 completed/success บน Ubuntu24.04.5 / Node24.22.2: 29 suites รวม 63 recovery cases และ 81 Person-link cases ตรวจ head SHA และ decoded logs ตรงกัน อ่าน AGENTS และเอกสารที่ผู้ใช้กำหนดแล้ว

Executable inputs 112 ไฟล์ตรง remote baseline เมื่อปรับเพียง CRLF/LF ก่อนเริ่มงาน รอบนี้รันทดสอบเดิมแบบ synthetic บน Windows Node24.22.1: session-recovery 63 และ transaction-reliability 45 cases PASS ไม่เพิ่ม/แก้ test หรือ source ไม่รัน build/npm ci/full29 ซ้ำในงานเอกสาร และไม่อ้างว่า acceptance ใหม่ด้านล่างผ่านแล้ว

Policy v1.1 คงเดิม: สมัคร/login ได้ทันที, Person linking เป็น Admin-verified exact ID และ first-link-only, User ใช้รถ/ดูประวัติและรายงานเฉพาะ ownerUserId, reminders แบบจำกัดข้อมูล ไม่มี Staff activation, Employee conversion, name matching, relink หรือ ownership backfill Operator/Live/Initialize/Deployment ยังคง DEFERRED

## 2. สิ่งที่ระบบปัจจุบันทำได้จริง

| หลักฐานจาก source | ความสามารถและข้อจำกัด |
| --- | --- |
| [trip-recovery.ts](../src/trip-recovery.ts), [trip-submit.ts](../src/trip-submit.ts) | Pointer ต่อแท็บไม่เกิน512ตัวอักษร เก็บ UUID/kind/opaque session scope/เวลา8h ไม่มี payload หรือ credentials; same-page retry รักษา ID/payload เดิม; reload ใช้ pointer ตรวจผลอย่างเดียว |
| [App.tsx](../src/App.tsx): configureRecovery/expired/reconcile | confirmed ที่ตรวจรูปแบบตรงกันจึงแสดง original receipt และล้าง pointer; unknown/network error ยังคงกั้นรายการใหม่; expiry/logout/session เปลี่ยน scrub เป็น blocked tombstone ไม่มีปุ่มล้างหรือ reset |
| [api.ts](../src/api.ts): GET | รับ operationId + operationKind เท่านั้น ค้นใน namespace ของ actor ปัจจุบันและ current session epoch แล้ว recheck authorization/state หลังอ่าน ledger; ไม่มี accountId selector หรือการค้น candidate ข้ามบัญชี |
| [trip-operation.ts](../src/trip-operation.ts) | ตรวจ actor/role/driver/owner/car/kind/receipt/version/fingerprint shape; POST เทียบ request fingerprint; corrupt/changed scope ปฏิเสธ ไม่ซ่อมข้อมูล |
| [storage.ts](../src/storage.ts): writeTripOperation | INSERT OR IGNORE ledger + main CAS + atomicity assertion ใน batch เดียว ไม่ overwrite operation ที่ commit แล้ว; ไม่มี cancel/rejection tombstone/manual reset protocol |
| [auth.ts](../src/auth.ts): viewForUser | User ได้ own projection; Admin ได้ Fleet/members/audit ตามสิทธิ์เดิม แต่ไม่มี raw ledger list/search ใน projection |
| [api.ts](../src/api.ts): audit/result | Fleet audit บันทึก trip ก่อน/หลัง; ledger มี operation ID, actor, fingerprint, result และ receipt แยกจาก main. Fleet audit อย่างเดียวไม่มี mapping operation UUID ที่เพียงพอสำหรับรหัสที่หาย |
| [SESSION_PERSON_RECOVERY.md](SESSION_PERSON_RECOVERY.md) | ไม่มี cross-device/global pending lock; main-only backup ไม่รวม ledger แยก จึงไม่ใช่หลักฐาน rollback ทั้งระบบ |

แม้เป็น Admin การใช้ lookup เดิมก็ค้น namespace ของ Admin เอง ไม่ใช่ User ที่ติดต่อมา ห้าม impersonate, ขอ cookie, สวม User หรือส่ง parameter ที่ไม่มีใน contract เพื่อเลี่ยงข้อจำกัด

คำว่า immutable ledger หมายถึง application write-once behavior ภายใต้ CAS ไม่ใช่ digital signature หรือหลักฐานที่ต้านผู้มีสิทธิ์แก้ฐาน/restore ได้ทุกกรณี main/ledger ที่มาจากคนละ epoch หรือ snapshot ต้องถือว่าหลักฐานไม่ครบ การอ่านปัจจุบันยังไม่พิสูจน์อดีตทั้งหมด

Read-only flow อ้างถึงฐานที่ initialize แล้วและมี sessionKey ถูกต้องเท่านั้น readState เดิมมี lazy initialization สำหรับ state รุ่นเก่าที่ขาด key; ห้ามใช้ support flow เป็นเครื่องมือ initialize/ซ่อมฐานหรือรับรองว่า GET ทุกสภาพไม่มี write หากพบสภาพผิดปกติให้หยุด

## 3. สถานะที่สังเกตได้และมาตรฐานการสรุป

| สถานะ | หลักฐานขั้นต่ำ | ข้อความ/การดำเนินการที่ปลอดภัย |
| --- | --- | --- |
| CONFIRMED_SUCCESS | ผลจาก lookup เดิมที่ authorized และตรง operation identity พร้อม valid original receipt; หรือหลักฐาน server ที่เทียบเท่าจาก capability ที่ได้รับอนุมัติในอนาคต | “ยืนยันว่ารายการเดิมบันทึกแล้ว” แสดง original result ของตน ไม่ส่งซ้ำ; pointer ที่ใช้ได้ล้างผ่านกลไกเดิมเท่านั้น |
| CONFIRMED_REJECTION — attempt only | First-attempt response ที่เชื่อถือได้ ผูกกับคำขอที่แน่ชัด และไม่มีการส่งก่อนหน้าที่ผลไม่ทราบ โดย boundary ยืนยันว่า attempt นี้ไม่เขียน | “คำขอนี้ถูกปฏิเสธ” ไม่ใช่หลักฐานว่า logical operation ไม่เคย commit; runbook นี้ไม่อนุญาตสร้าง ID/ส่งใหม่ |
| UNRESOLVED_UNKNOWN | Timeout, lost response, lookup unknown, candidate หลายรายการ หรือมี earlier attempt ที่ไม่ทราบผล | “ยังยืนยันผลไม่ได้ กรุณาหยุดทำรายการซ้ำ” คง gate/ติดต่อ Admin; ไม่มี success หรือ failure receipt ที่แต่งขึ้น |
| AUTHORIZATION_CHANGED |401/403, role/status/link/epoch เปลี่ยน หรือ current authorization ไม่ตรง | “เซสชันหรือสิทธิ์เปลี่ยน ต้องตรวจสิทธิ์ก่อน” ห้ามคืนสิทธิ์/เปลี่ยน Person เพื่อดู receipt; historical success อาจเป็นจริงแต่ไม่ได้ให้สิทธิ์ปัจจุบัน |
| EVIDENCE_UNAVAILABLE | Pointer หาย/เป็น tombstone, storage ถูกล้าง, device ใหม่, ledger corrupt/missing หลัง restore, provenance ไม่ครบ หรือระบบอ่านไม่ได้ | “หลักฐานยังไม่เพียงพอ” บันทึกข้อจำกัดและคง blocked; ไม่อ้างว่าไม่มีรายการ |

สถานะอาจซ้อนกัน ให้ข้อจำกัดด้านสิทธิ์และหลักฐานมีลำดับก่อนการแสดงข้อมูล หากมี receipt เดิมแต่สิทธิ์ถูกเพิกถอน ให้ Admin ตรวจตามสิทธิ์เดิมได้ แต่ห้าม User ใช้ receipt คืน operational access

**ไม่มี durable confirmed-rejection/terminal-noncommit record ในระบบปัจจุบัน** ดังนั้นเมื่อ pointer หาย โดยทั่วไปจะพิสูจน์ CONFIRMED_REJECTION ของ operation เดิมไม่ได้ Response400/401/403/409 หลัง attempt ที่ uncertain ไม่ลบ uncertainty. HTTP200 ก็ไม่พอหาก receipt/identity/schema ไม่ผ่าน guard

ไม่พบแถว แม้อ่าน primary แล้ว, รถดูว่าง, ประวัติหน้าจอไม่มีรายการ, audit ไม่พบ, ผ่าน15วินาที/8ชั่วโมง หรือผู้ใช้จำว่ากดครั้งเดียว ล้วนไม่พิสูจน์ว่าคำขอเก่าจะไม่ commit ภายหลัง ห้ามใช้เวลารอคงที่เป็น unlock rule

## 4. User self-help — ใช้ความสามารถที่มีอยู่เท่านั้น

ขั้นตอนต่อไปนี้เป็น runbook ที่เสนอสำหรับบริบท offline/local; ไม่อนุมัติให้เชื่อมระบบจริงใน task นี้

1. หยุดกดบันทึกซ้ำ อย่าเปิดแท็บ/device ใหม่เพื่อลองธุรกรรมเดิม อย่าล้าง storage, ออกจากระบบเพื่อแก้ gate, สร้าง ID หรือกรอกย้อนหลังเพื่อชดเชย หากรถยังใช้อยู่/คืนแล้วให้แจ้งสถานการณ์แก่ Admin โดยไม่เปลี่ยนประวัติให้ตรงคำบอกเล่า
2. ถ้าแท็บเดิมยังใช้งานได้และมีปุ่ม “ตรวจสอบผลรายการเดิม” ให้ใช้การตรวจแบบอ่านอย่างเดียว ไม่ reconstruct payload. หากเป็นปัญหาเครือข่าย ให้รอผู้ใช้ตัดสินใจตรวจใหม่เมื่อเชื่อมต่อได้ ไม่มี auto polling. หลัง refresh จะไม่ POST รายการเดิม
3. ถ้ายืนยันสำเร็จผ่าน guard ให้ดู original receipt และสถานะล่าสุดของทริปตนเอง Checkout ที่ยืนยันแล้วอาจต้องคืนรถตามปกติเมื่อถึงเวลา; return ที่ยืนยันแล้วห้ามคืนซ้ำ Receipt ไม่ใช่คำสั่งให้ทำธุรกรรมใหม่ใน runbook นี้
4. ถ้า pointer ไม่อยู่/expired/blocked/สิทธิ์เปลี่ยน ให้หยุดทาง recovery เดิม Login ใหม่ได้ตามนโยบาย แต่ไม่ใช่การปลดล็อก ใช้ประวัติ/รายงานของตนเองที่ยัง authorized เพื่ออธิบายข้อเท็จจริงเท่านั้น การพบทริปคล้ายกันเป็น candidate ไม่ใช่การยืนยัน operation ที่หาย
5. ติดต่อ Admin ผ่านช่องทางส่วนตัวที่องค์กรอนุมัติไว้แล้ว โดยส่งเท่าที่จำเป็น: checkout หรือ return, ทะเบียนที่ตนเลือก, ช่วงเวลาโดยประมาณพร้อม Asia/Bangkok, หมายเลขอ้างอิงที่ UI แสดงถ้ามี, เกิด timeout/refresh/logout/storage/device change อย่างไร, ข้อความ error ที่ตัดข้อมูลส่วนเกินออก หากหลายความพยายามให้ระบุว่า “อาจหลายคำขอ/จำไม่ได้” ไม่เดาลำดับ
6. ไม่ขอให้ User ดึง operation UUID จาก DevTools/sessionStorage/network dump; ไม่มีหน้าค้น/แสดง UUID ใหม่ในงานนี้ หากมี reference ที่ระบบแสดงอยู่เดิม ให้ใช้เฉพาะในช่องทาง support ที่เหมาะสม ไม่โพสต์สาธารณะ ไม่ส่ง password, token, cookie, Authorization, sessionKey, raw ledger, full Fleet export, backup หรือ identity document
7. Admin แจ้งกลับเพียงผลที่พิสูจน์ได้ของผู้ใช้รายนั้น หรือ “ยังตรวจไม่ได้/ต้องคงการบล็อก” ไม่แจ้งชื่อ/รายการของบัญชีอื่น ผู้ใช้ไม่แก้ tombstone ตามคำแนะนำทางแชต

ข้อความเสนอ: “ยังไม่สามารถยืนยันว่ารายการเดิมสำเร็จหรือไม่ กรุณาอย่าบันทึกซ้ำ แจ้งผู้ดูแลเฉพาะรถ ช่วงเวลา และข้อความผิดพลาด โดยไม่ส่งรหัสผ่านหรือข้อมูล session” ข้อความนี้เป็น design copy ไม่ได้เปลี่ยน UI

## 5. Admin support — ตรวจข้อมูลเดิม ไม่ปลดล็อก

1. รับเรื่องโดยใช้ตัวตน/บัญชีที่ระบบยืนยันอยู่แล้ว เลือก stable account ID จากข้อมูล Admin ที่ได้รับอนุญาต ห้ามยืนยัน ownership จากชื่อเหมือนกัน, driverId หรือทะเบียนอย่างเดียว ไม่มีการขอหลักฐานระบุตัวตนเพิ่มเติม/เก็บเอกสารใหม่ในขั้นตอนนี้ หาก UI ไม่เปิดเผย ID/หลักฐานที่ต้องใช้ ให้บันทึกว่า unavailable ไม่ใช้ Developer Tools หรือฐานจริงเป็นทางลัด
2. บันทึก environment, เวลา review, implementation/client version และช่วงเวลาที่เกิดเหตุที่ทราบจริง ไม่ใส่ Production credential/DB ID/secret ใน support case รอบนี้ใช้ synthetic เท่านั้น
3. ตรวจ authorization ปัจจุบัน: role/status/Person link, Person active, own open trip และ current Fleet version จากมุมมอง Admin เดิม ห้าม re-enable/promote/relink เพื่อให้ recovery ผ่าน การแก้สิทธิ์โดยธุรกิจเป็นงานแยก แม้ Admin จะมีสิทธิ์จัดการเดิมก็ตาม
4. อ่านประวัติและ audit ที่ Admin มีสิทธิ์ดูอยู่แล้ว จำกัด candidate ด้วย exact ownerUserId ของบัญชี, car, kind และช่วงเวลา ใช้เวลา/รถเพื่อค้นหา candidate เท่านั้น ไม่ใช้ driverId/name เป็นข้อพิสูจน์ User ownership. Legacy trip ที่ไม่มี ownerUserId หรือบันทึกโดย Admin ไม่ถูกยกให้ User อัตโนมัติ
5. แยกข้อเท็จจริง: “มี trip ID นี้และมีการคืนรถแล้ว” ออกจากข้อสรุปว่า “นี่คือ operation เดิมที่กู้รหัสไม่ได้” Audit actor เป็นข้อความแสดงผลและ Fleet audit ไม่มี operation UUID mapping ครบ จึงใช้แทน authenticated actor/ledger provenance ไม่ได้
6. ถ้าแท็บ/User เดิมยัง lookup ได้ ให้ผู้ใช้ตรวจใน scope ของตนเอง หากต้องดู ledger ของ User จาก Admin หรือค้น ID ที่หาย ต้อง capability ใหม่และ approval แยกตามข้อ7; ขั้นตอนปัจจุบันจบที่ candidate/unavailable ได้ ไม่มีคำสั่ง SQL/Cloudflare/impersonation ใน runbook
7. เมื่อหลักฐานขัดแย้ง, candidate หลายแถว, account/epoch เปลี่ยน, ledger corrupt, restore ไม่ครบ หรืออาจมี request in flight ให้คง blocked และรายงานเจ้าของระบบ ไม่ลบ trip/ledger, แก้เลขไมล์, นำเข้าไฟล์, สร้างทริปทดแทน, restore main หรือหมุน sessionKey เพื่อปิดเรื่อง
8. แจ้งผลเฉพาะที่พิสูจน์ได้และสิ่งที่ยังขาด ระบุว่า support review ยังไม่ reset และไม่ได้ยกเลิกคำขอเก่า ไม่มีสัญญาว่ารอระยะหนึ่งแล้วลองใหม่ได้ การดูข้อมูลจริงหรือเปิดใช้เครื่องมือในอนาคตต้องได้รับอนุมัติแยก

## 6. เหตุการณ์ที่ต้องรองรับ

| เหตุการณ์ | แนวทาง | ข้อจำกัดที่ต้องบอกผู้ใช้ |
| --- | --- | --- |
| Lost response/timeout, pointer ยัง valid | Existing explicit read-only lookup; ใช้ original receipt เมื่อ confirmed | unknown ยังอาจมี late commit; ห้าม new ID |
| Reload, pointer/session เดิม | ตรวจผลเดิมเท่านั้น ไม่มี payload POST หลัง reload | ต้องผ่าน current auth และ receipt validation |
| Tab close หรือ storage clear | หยุด resubmit; ตรวจ own history/candidate กับ Admin | Pointer อาจกู้ไม่ได้; ไม่มี global pending lock; เปิดแท็บใหม่ไม่ใช่วิธี recovery |
| Logout/session expiry/relogin | ยอมรับการ scrub/tombstone และ re-auth เฉพาะ account access | Session ใหม่ไม่ฟื้น pointer/สิทธิ์และไม่ยืนยัน outcome |
| Device/browser ใหม่ | Self-help/read-only own history; Admin review | ไม่มีการ sync/copy sessionStorage หรือ credentials ข้ามเครื่อง |
| Account disabled/role/link เปลี่ยน | คงการปฏิเสธ; Admin ตรวจตามสิทธิ์เดิม | ไม่มี privileged recovery bypass/Person relink |
| Person inactive | ไม่เริ่ม checkout ใหม่; own open return ใช้กฎเดิมเมื่อไม่มี unresolved gate และยัง authorized | Person inactive ไม่ใช่ข้ออ้างล้าง unknown; ถ้ามี gate ให้ตรวจผลก่อน |
| Network/storage/query unavailable | หยุดและบอก evidence unavailable; manual read-only check เมื่อพร้อม | ไม่มี fallback ไป write, secondary database หรือ retry endpoint อื่น |
| Epoch/restore หรือ main/ledger ไม่ครบ | แยก incident เพื่อ review provenance | Main-only backup/hash ไม่พิสูจน์ operation ledger; ห้าม restore เพื่อปลดล็อก |

## 7. Capability ที่ต้องตัดสินใจแยก — ยังไม่พัฒนา

**Recommendation:** ทำ read-only support discovery/review ก่อน; ยังไม่ทำ unlock/reset. Existing lookup ไม่รองรับ Admin target selector, ID-lost search, old-epoch evidence หรือ support audit event โดยเฉพาะ ความสามารถเหล่านี้ต้องผ่าน scoped implementation approval แม้ไม่มี write ต่อ Fleet

ข้อเสนอสำหรับรอบพัฒนา offline ถัดไป: Admin current-auth เท่านั้น, exact target account ID, optional known operation ID หรือ bounded car/time/kind filters; server rechecks authorization/snapshot and provenance; paginate/limit candidates; ไม่มี SQL/query arbitrary, secrets, raw payload, current/old sessionKey หรือ cross-tenant/environment fallback. คำค้นแบบเวลาไม่มีผล “confirmed” โดยตัวเอง

DTO ที่เสนอ: support case reference, target reference ที่แสดงเฉพาะ Admin ที่ได้รับสิทธิ์, operation/trip stable references เท่าที่จำเป็น, kind, commit version/provenance assessment, current authorization outcome, evidence status และ candidate count. User ได้เฉพาะ own status/original permitted receipt; ไม่ได้ candidate ของบัญชีอื่นหรือ raw ledger. รายการนี้เป็น design ไม่ใช่ endpoint/field ที่เปิดอยู่

Support log สำหรับ lookup ต้องเป็น privacy-minimized, มีผู้ตรวจ/เหตุผล/เวลา/target scope/แหล่งหลักฐาน/ผลและข้อจำกัด ไม่ใส่ credentials/headers/receipt payload หรือ free-text identity evidence ลง Git/ไฟล์สาธารณะ/โฟลเดอร์ sync ทั่วไป งานนี้ไม่สร้าง support case จริงหรือ log store; owner ต้องเลือก ACL/retention/storage และอนุมัติ data shape ก่อน

### Gate สำหรับ manual unlock/reset ในอนาคต

- นิยามให้ชัดว่าคลายเพียง browser UX barrier หลังพิสูจน์ผล ไม่เปลี่ยน trip, odometer, owner, account role/status/link หรือ ledger. การแก้ข้อมูลธุรกิจต้องเป็น workflow แยก ห้ามปนกับ recovery
- ผูก decision กับ exact target account, operation/case identity, environment/provenance, evidence version และ current session/authorization; reviewer และ authority ต้องตรวจจาก server ไม่เชื่อ manifest หรือข้อความ User ที่สร้างเอง
- Confirmed success ต้องตรวจ receipt/ledger/current trip/ownership/authorization ตรงกันอีกครั้งก่อน apply; evidence stale/changed หรือ corrupt ต้องปฏิเสธ ไม่ส่งธุรกรรมซ้ำและไม่ backfill ข้อมูลเพื่อให้ตรง
- หากอ้าง confirmed noncommit ต้องมี protocol ที่กัน late commit ได้จริง เช่น atomic terminal fence ของ operation เดิมที่ผ่านการออกแบบ/อนุมัติและทดสอบ race. Timeout, current absence หรือ Admin declaration อย่างเดียวใช้แทนไม่ได้ ปัจจุบันไม่มี fence หรือ cancellation จึงไม่ unlock เส้นทางนี้
- ถ้า original ID/epoch หายและพิสูจน์ความเชื่อมโยงไม่ได้ ให้คง blocked; ห้ามสร้าง ID ใหม่มาทำเป็น identity ของ operation เดิมหรืออ้าง current version CAS เป็น cancellation fence
- Apply ต้องเป็น explicit operator action, ใช้ authenticated server decision reference, จำกัดอายุ/one-use และ revalidate สิทธิ์+state; no automatic reset. กลไกจัดเก็บ decision/consume/audit ต้อง atomic หรือ fail closed ไม่มี partial unlock และมี duplicate/concurrent handling
- บันทึก support access/review/approval/apply/refusal พร้อม scope, evidence references, outcome, versions และเวลาที่จำเป็น โดยไม่เขียนทับ audit/ledger เดิม; ต้องออกแบบกรณี audit write ล้มเหลวให้ refuse apply. Lookup audit ถ้าต้องเพิ่ม persistence ต้องขออนุมัติ schema/format แยก
- ต้องมี owner approval ต่อ authority (หนึ่ง/สอง reviewer), evidence threshold, storage/retention, pending-write fencing, lifecycle/account isolation และ rollback/compensation. ไม่มี hidden reset, DevTools instruction, ledger deletion หรือ restore shortcut

Rollback capability ใหม่ในอนาคตต้องปิดการ apply ได้โดยไม่ปล่อย decision ค้างให้ถูกใช้ซ้ำ ไม่ลบประวัติ/ledger ไม่ลดเวอร์ชันแบบสูญข้อมูล และไม่ทำให้ browser marker ที่หมดอายุเปิด write อัตโนมัติ รายละเอียดนี้ยังต้องพิสูจน์ offline ก่อน owner อนุมัติ operational work

## 8. Risk / owner decision queue

| ID / ระดับ | ความเสี่ยงหรือทางเลือก | Recommendation / decision ที่ยังต้องอนุมัติ |
| --- | --- | --- |
| D1 / High | Admin ค้น User ledger/ID ที่หายไม่ได้ใน contract ปัจจุบัน | อนุมัติ read-only discovery/review แบบ exact account + bounded candidates แยกก่อน; ไม่ขยาย User/Employee/Staff scope |
| D2 / Critical | False absence และ delayed commit ทำให้ reset แล้วส่งซ้ำ | ยังไม่อนุมัติ noncommit unlock; owner ต้องตัดสินใจว่าจะออกแบบ terminal fence/cancellation หรือคง manual escalation |
| D3 / High | อำนาจ approve/apply และ self-review ของ Admin/root | owner เลือกหนึ่ง/สองผู้ตรวจและ fallback หากไม่มีคนอิสระ; ค่า default ใน design นี้คือยังไม่ apply ไม่ใช่เพิ่มสิทธิ์ให้ root อัตโนมัติ |
| D4 / High | Support evidence/log มีข้อมูลส่วนบุคคลและต้องเก็บนานเท่าใด | owner เลือกที่เก็บ private/ACL/retention/purge และ DTO ที่จำเป็น; ไม่เก็บ raw ledger/เอกสารตัวตนใน Git หรือ sync folder; ไม่มีค่า retention ที่ถือว่าอนุมัติแล้ว |
| D5 / Critical | Old epoch, restore main-only, corrupt/missing ledger | owner ต้องอนุมัติ provenance/evidence lineage และเกณฑ์หยุด; ห้าม cross-epoch auto-match/reset หรืออ้าง SHA ของ main เป็นหลักฐานครบ |
| D6 / High | อายุ/การใช้ซ้ำของ decision และ audit/CAS race | อนุมัติ apply/consume/audit protocol และ versioned storage เฉพาะหลัง offline proof; ปัจจุบันยังไม่มี decision token/endpoint |
| D7 / Medium | Browser close/cleared storage/new deviceไม่มี global gate | สื่อสารข้อจำกัดและออกแบบ self-help/support; global pending lock เป็น feature/policy เพิ่ม ต้องแยกอนุมัติ ไม่เพิ่มในงานนี้ |
| D8 / High | Support ไปเปลี่ยนทริป/เลขไมล์/สิทธิ์เพื่อทำให้ review ผ่าน | Recovery อ่าน/ตรวจเท่านั้น; correction, re-enable, relink และ migration เป็นงานแยกตามนโยบายที่อนุมัติ ไม่ดำเนินการใน task นี้ |

ทุก decision ยัง OPEN. Recommendation ไม่ใช่ owner approval. สถานะ default สำหรับ unlock/reset คือ NOT_APPROVED และ remain blocked; ไม่ขอให้ผู้ใช้อนุมัติคำสั่งเชื่อมระบบจริงในเอกสารนี้

## 9. Future offline acceptance plan — specifications, NOT_RUN

ใช้ fictional local fixture: accounts u-a/u-b (linked active User), a-review (legacy Admin), e-old (legacy Employee), p-a/p-b, cars c-a/c-b, one owned open trip t-a, one closed trip t-b และ unowned legacy trip t-old ที่ driverId อาจเหมือน u-a. มี ledger commit สำหรับ k-start/k-return, unknown k-late, two schema-valid evidence snapshots v10/v11 และ bad/cross-epoch copies ใช้ UUIDv4 synthetic และ memory/SQLite เท่านั้น ไม่มี credential จริง ไม่สร้าง fixture/test file ใน task นี้

ทุก future case ต้อง assert complete Fleet/accounts/people/trips/Maintenance/audit/ledger/schema snapshot ไม่เปลี่ยนจากการ review/deny; เฉพาะ support audit ที่ออกแบบและอนุมัติไว้จึงมี delta ได้ ต้องระบุ expected delta แยก ห้ามนับ design specifications ต่อไปนี้เป็น cases ที่ผ่านแล้ว

| Case | Scenario | Acceptance |
| --- | --- | --- |
| M01 | Valid same-session pointer + committed checkout | Original own receipt only; zero POST/new ID/trip delta |
| M02 | Known return already committed | Return เดิมยืนยันครั้งเดียว; ไม่เปลี่ยน odometer ซ้ำ |
| M03 | First-attempt rejection มีหลักฐานครบ | จำกัดคำสรุปเฉพาะ attempt; ไม่ออก terminal-noncommit/reset permission |
| M04 | Earlier timeout แล้วได้400/401/403/409 | ยัง unknown/auth changed; ไม่ล้าง uncertainty |
| M05 | Primary lookup absent แล้ว delayed request commit | ก่อน commit ยัง blocked; หลัง commit จึงยืนยันได้; zero duplicate |
| M06 | Tab close/storage clear/device ใหม่ | ไม่สร้าง ID, copy credentials หรือสรุปว่าไม่มี operation; escalate |
| M07 | Expiry/logout/relogin และ malformed pointer | Scrub identifier/tombstone ตาม contract; ไม่มี automatic unlock |
| M08 | Account/status/password/role/link เปลี่ยน | Fresh server auth ปฏิเสธ outcome ที่ไม่มีสิทธิ์; ไม่มี role/link bypass |
| M09 | Same name/driver/car/time แต่ owner ต่างหรือไม่มี owner | Candidate ไม่กลายเป็น own operation; ไม่ backfill owner |
| M10 | Admin ใช้ lookup เดิมกับ User UUID | ไม่เกิด cross-actor lookup; แยก unavailable จาก not-found proof |
| M11 | Future authorized exact-account discovery | Bounded/minimized candidates เท่านั้น; ห้าม implicit confirmed จากเวลา |
| M12 | User/Employee/Staff/forged Admin ขอ support search | Deny server-side; no raw rows/other-user DTO/privilege activation |
| M13 | Multiple/no/ambiguous candidates หรือ timezone ข้ามวัน | Remain unknown; ระบุ Asia/Bangkok/UTC source ชัด ไม่เดา mapping |
| M14 | Corrupt receipt/owner/car/kind/fingerprint/version | Fail closed ไม่ซ่อม/ลบ evidence หรือแสดง false success |
| M15 | Old epoch/partial backup/main-ledger ไม่ตรงกัน | Evidence unavailable; ไม่ fallback ข้าม namespace/ฐาน |
| M16 | Network/query/storage unavailable | ไม่มี fallback write, retry route อื่น หรือ reset; metadata/log ไม่รั่ว |
| M17 | Stale evidence v10 ขณะ state เปลี่ยน v11 | Refuse apply; new current-auth evidence required |
| M18 | Forged/expired/replayed/cross-account support decision | Refuse; ห้ามให้ authority จาก client JSON หรือ UI checkbox อย่างเดียว |
| M19 | Concurrent reviewers/apply และ audit failure | Fail closed/atomic one-use ตาม future approved protocol; no partial unlock |
| M20 | Reset-vs-late-commit race (future fence proposal) | ต้องพิสูจน์ fence จัดลำดับกับ write จริง; absence/elapsed time ไม่ผ่านเกณฑ์ |
| M21 | Inactive Person แต่ own open return | รักษานโยบายเดิมเมื่อ authorized และไม่มี unresolved gate; ไม่เริ่ม checkout |
| M22 | Original trip แก้โดย authorized Admin หลัง commit | แยก original receipt/current state; inconsistency ไม่ auto-unlock หรือ rewrite |
| M23 | Desktop/360px/390px, multi-tab, refresh, screen reader | Thai copy แยก five states; read-only path ใช้ได้; ไม่มี hidden reset/false success |
| M24 | Private support log/notification/retention test | ไม่มี token/cookie/headers/raw payload/other-user data; ACL/purge ตาม owner decision |
| M25 | Legacy Admin/Employee, v4/schema3 backup, CAS/replay regression | ทั้ง29 suites/63 recovery cases เดิมยังผ่าน; ไม่มี Employee conversion/Staff activation |

ถัดไปเสนอ **3D.4D-6: Owner-reviewed read-only support lookup contract + offline proof** หลังตัดสินใจ D1 และ privacy/audit ส่วนที่เกี่ยวข้องก่อน การทำ read-only capability ไม่เท่ากับอนุมัติ D2/D3/D5/D6 หรือ unlock/reset; ถ้าไม่อนุมัติให้คง runbook/self-help และ blocked outcomes ต่อไป

## 10. สิ่งที่งานนี้ไม่ทำ

ไม่มี src/tests/routes/config/schema/database change, reset/unlock button/function/endpoint, operation ID regeneration, blind resubmit, ledger deletion หรือ support record จริง ไม่มี Cloudflare API/credentials/real D1, Production/Demo, Initialize/Deploy/Merge, account conversion/migration, R2/Cron/public URL หรือการส่งข้อความหาใคร Operator/Live/Initialize/Deployment ยังคง DEFERRED
