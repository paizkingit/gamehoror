# THE LAST NIGHT: SHADOW HOUSE

Prototype game horror first-person berbasis Three.js, siap dicoba di browser Android.

## Menjalankan
Karena Three.js diambil dari CDN, jalankan melalui web server lokal/hosting (bukan file:// jika browser memblokir module).

Contoh:
python -m http.server 8080

Lalu buka:
http://localhost:8080

Untuk HP Android di jaringan Wi-Fi yang sama, gunakan IP komputer:
http://IP-KOMPUTER:8080

## Kontrol Android
- Joystick kiri: bergerak
- Swipe kanan: melihat
- FLASHLIGHT: senter
- RUN: sprint
- CROUCH: jongkok
- BAG: inventory
- Ⅱ: pause
- INTERACT muncul otomatis ketika dekat objek

## Kontrol PC
- WASD: bergerak
- Mouse/area sentuh: melihat
- F: senter
- E: interact
- I: inventory
- Shift: sprint
- Crouch memakai tombol Crouch pada UI

## APK Android
Project ini dibuat agar mudah dibungkus dengan Capacitor. Setelah project Node/Capacitor dibuat, salin isi folder ini ke folder web app lalu gunakan `npx cap add android` dan `npx cap sync android`.

## Catatan
Prototype menggunakan bentuk 3D procedural agar dapat berjalan tanpa asset model/audio eksternal. Folder assets disediakan untuk pengembangan asset berikutnya.
