import json

en = {
 "today-partial":"Some details are temporarily unavailable.",
 "today-op-confirmed":"Done — your workspace has been updated.",
 "today-hero-clear-title":"You're all caught up",
 "today-panel-close":"Close","today-panel-submit":"Confirm","today-panel-working":"Working…",
 "today-panel-candidate-title":"Continue your application","today-panel-candidate-desc":"Complete the representative step to simulate registration progress.",
 "today-panel-candidate-s1":"Review your application details","today-panel-candidate-s2":"Confirm your contact information",
 "today-panel-candidate-result":"Application step recorded — pending verification.",
 "today-panel-onboarding-title":"Replace rejected document","today-panel-onboarding-desc":"Submit a clearer copy of your certification document.",
 "today-panel-onboarding-s1":"Capture a clear photo of the document","today-panel-onboarding-s2":"Confirm the document type",
 "today-panel-onboarding-result":"Replacement submitted — pending review (not yet approved).",
 "today-panel-learning-title":"Resume required module","today-panel-learning-desc":"Complete the simulated module step to update your progress.",
 "today-panel-learning-s1":"Review the module material","today-panel-learning-s2":"Mark the step complete",
 "today-panel-learning-result":"Module progress updated — certification not yet issued.",
 "today-panel-cert-title":"Review certification status","today-panel-cert-desc":"Check the current verification state and permitted actions.",
 "today-panel-cert-s1":"Verification is performed by the certification team",
 "today-panel-cert-result":"Status noted — official verification is external.",
 "today-panel-active-title":"Resolve follow-up","today-panel-active-desc":"Complete this representative follow-up step.",
 "today-panel-active-s1":"Confirm the follow-up outcome","today-panel-active-result":"Follow-up recorded — remaining priorities updated.",
 "today-panel-ineligible-title":"Eligibility remediation","today-panel-ineligible-desc":"Submit a remediation step; eligibility is re-verified externally.",
 "today-panel-ineligible-s1":"Complete the required CPD activity","today-panel-ineligible-s2":"Attach supporting evidence",
 "today-panel-ineligible-result":"Remediation submitted — pending verification, not auto-approved.",
 "today-panel-suspended-title":"Case remediation","today-panel-suspended-desc":"Submit permitted remediation for the open case.",
 "today-panel-suspended-s1":"Describe the remediation taken","today-panel-suspended-result":"Response recorded — case remains under review.",
 "today-panel-offboard-title":"Handover checklist","today-panel-offboard-desc":"Complete the next permitted handover step.",
 "today-panel-offboard-s1":"Confirm handover items transferred","today-panel-offboard-result":"Handover step recorded.",
}

id = {
 "today-partial":"Sebagian detail sementara tidak tersedia.",
 "today-op-confirmed":"Selesai — ruang kerja Anda telah diperbarui.",
 "today-hero-clear-title":"Semua beres",
 "today-panel-close":"Tutup","today-panel-submit":"Konfirmasi","today-panel-working":"Memproses…",
 "today-panel-candidate-title":"Lanjutkan lamaran Anda","today-panel-candidate-desc":"Selesaikan langkah perwakilan untuk mensimulasikan progres pendaftaran.",
 "today-panel-candidate-s1":"Tinjau detail lamaran Anda","today-panel-candidate-s2":"Konfirmasi informasi kontak",
 "today-panel-candidate-result":"Langkah lamaran tercatat — menunggu verifikasi.",
 "today-panel-onboarding-title":"Ganti dokumen yang ditolak","today-panel-onboarding-desc":"Kirim salinan yang lebih jelas dari dokumen sertifikasi Anda.",
 "today-panel-onboarding-s1":"Ambil foto dokumen dengan jelas","today-panel-onboarding-s2":"Konfirmasi jenis dokumen",
 "today-panel-onboarding-result":"Pengganti dikirim — menunggu tinjauan (belum disetujui).",
 "today-panel-learning-title":"Lanjutkan modul wajib","today-panel-learning-desc":"Selesaikan langkah modul simulasi untuk memperbarui progres.",
 "today-panel-learning-s1":"Tinjau materi modul","today-panel-learning-s2":"Tandai langkah selesai",
 "today-panel-learning-result":"Progres modul diperbarui — sertifikasi belum diterbitkan.",
 "today-panel-cert-title":"Tinjau status sertifikasi","today-panel-cert-desc":"Periksa status verifikasi saat ini dan tindakan yang diizinkan.",
 "today-panel-cert-s1":"Verifikasi dilakukan oleh tim sertifikasi",
 "today-panel-cert-result":"Status dicatat — verifikasi resmi bersifat eksternal.",
 "today-panel-active-title":"Selesaikan tindak lanjut","today-panel-active-desc":"Selesaikan langkah tindak lanjut perwakilan ini.",
 "today-panel-active-s1":"Konfirmasi hasil tindak lanjut","today-panel-active-result":"Tindak lanjut tercatat — prioritas tersisa diperbarui.",
 "today-panel-ineligible-title":"Remediasi kelayakan","today-panel-ineligible-desc":"Kirim langkah remediasi; kelayakan diverifikasi ulang secara eksternal.",
 "today-panel-ineligible-s1":"Selesaikan aktivitas CPD wajib","today-panel-ineligible-s2":"Lampirkan bukti pendukung",
 "today-panel-ineligible-result":"Remediasi dikirim — menunggu verifikasi, tidak otomatis disetujui.",
 "today-panel-suspended-title":"Remediasi kasus","today-panel-suspended-desc":"Kirim remediasi yang diizinkan untuk kasus yang terbuka.",
 "today-panel-suspended-s1":"Jelaskan remediasi yang dilakukan","today-panel-suspended-result":"Tanggapan tercatat — kasus tetap dalam peninjauan.",
 "today-panel-offboard-title":"Daftar periksa serah terima","today-panel-offboard-desc":"Selesaikan langkah serah terima yang diizinkan berikutnya.",
 "today-panel-offboard-s1":"Konfirmasi item serah terima telah ditransfer","today-panel-offboard-result":"Langkah serah terima tercatat.",
}

for lang, keys in (("en", en), ("id", id)):
    p = f'src/i18n/messages/{lang}.json'
    with open(p, encoding='utf-8') as f:
        d = json.load(f)
    d.update(keys)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
print('i18n ok')
