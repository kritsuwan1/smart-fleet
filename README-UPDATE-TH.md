# อัปเดต Smart Fleet v3.8.2

ชุดนี้เป็นซอร์สฉบับเต็ม พร้อมหน้าแรกพนักงานและฟอร์มรับ–คืนรถตามแบบที่อนุมัติ
รายละเอียดและผลทดสอบอยู่ใน RELEASE-v3.8.2.md

## สถานะ

โค้ดใหม่ผ่าน Build, TypeScript และชุดทดสอบ รวมถึงตรวจหน้ามือถือและหน้า Admin ด้วยข้อมูลจำลองแล้ว
การส่งโค้ดเข้า GitHub จากแชตถูก GitHub ปฏิเสธ 403 Resource not accessible by integration จึงยังไม่ได้ Commit/Push หรือ Deploy เวอร์ชันนี้ผ่านแชต
การเห็นสิทธิ์ push ของเจ้าของบัญชีไม่ยืนยันสิทธิ์เขียนของการเชื่อมต่อแอป

## อัปเดตผ่าน GitHub Desktop

1. เปิด repository smart-fleet ใน GitHub Desktop กด Fetch origin และ Pull origin หากมี
2. เลือก Repository → Show in Explorer
3. แตก ZIP นี้ แล้วคัดลอกไฟล์และโฟลเดอร์ภายในทั้งหมดไปแทนที่ในโฟลเดอร์ repository เดิม อย่าลบโฟลเดอร์ .git และอย่าวาง ZIP ครอบอีกชั้น
4. เมื่อเปิดโฟลเดอร์ repository ต้องเห็น package.json, src, scripts, tests และ .github อยู่ระดับเดียวกัน
5. กลับ GitHub Desktop ตรวจ Changes แล้วใส่ Summary ว่า Update Smart Fleet v3.8.2 employee UI → Commit to main → Push origin
6. ไป GitHub → Actions → Deploy Smart Fleet → Run workflow → main → demo
7. ตรวจ version v3.8.2 โดยใช้บัญชีพนักงานสำหรับหน้าแรกใหม่ ทดสอบบันทึกใช้รถและคืนรถใน Demo
8. เมื่อ Demo ผ่าน สำรองข้อมูล Production แล้ว Run workflow อีกครั้ง โดยเลือก production

ใช้ GitHub Secrets และ DEMO_DATABASE_ID เดิม ไม่ต้องสร้าง Token ใหม่ ไม่ต้องรัน SQL หรือนำเข้า Excel ใหม่
ไม่มีข้อมูลจำลองหรือไฟล์ฐานข้อมูลใน ZIP นี้

## หมายเหตุการแสดงผล

บัญชีพนักงานจะแสดงหน้าแรกใหม่ บัญชี Admin ยังคงหน้าองค์กรและรายงานเดิม ทั้งสองสิทธิ์ใช้ฟอร์มรับ–คืนใหม่
เมนูล่างแสดงบนมือถือ เมนูด้านข้างยังใช้สำหรับรายงานและจัดการข้อมูลตามสิทธิ์
