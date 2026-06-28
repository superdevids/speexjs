# Kebijakan Keamanan

## Melaporkan Kerentanan

Kalau lo nemu celah keamanan di superjs-core, lapor lewat email: adityasuperdev@gmail.com

**JANGAN bikin GitHub issue publik untuk kerentanan keamanan.**

Lo bakal dapet respon dalam 48 jam. Kalo belum ada kabar, follow-up lewat email.

## Yang Perlu Disertakan

- Deskripsi kerentanan
- Langkah-langkah reproduksi
- Versi yang terpengaruh
- Dampak potensial
- Saran perbaikan (kalo ada)

## Ruang Lingkup

- Package npm superjs-core
- CLI tool dep-exray
- GitHub Actions workflows

## Di Luar Ruang Lingkup

- Fungsi `xorCipher` di module crypto **SENG A JA BUKAN untuk keamanan**. Itu cuma XOR obfuscation sederhana buat masking data ringan. Jangan pake buat enkripsi data sensitif.

## Kebijakan Disclosure

Begitu kerentanan dikonfirmasi:
1. Kita bakal kerjain fix
2. Security advisory bakal dipublish di GitHub
3. Versi yang udh di-patch bakal dirilis ke npm
4. Kredit bakal dikasih ke pelapor (kalo mau)
