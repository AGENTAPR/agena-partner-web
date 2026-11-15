import json

en = {
 "workspace-label":"Partner Workspace",
 "footer-support":"Support","footer-resources":"Resources",
 "today-page-title":"Today","today-hero-eyebrow":"Next best action","today-dev-tools":"Developer tools",
 "today-nba-fallback-desc":"This is your highest-priority item right now.",
 "today-hero-clear-desc":"No urgent work right now — review your journey below.",
 "today-due":"Due",
 "today-status-open":"Open","today-status-completed":"Done","today-status-blocked":"Blocked","today-status-in_review":"In review",
 "today-state-forbidden-title":"Access unavailable","today-state-unavailable-title":"Workspace unavailable",
 "today-state-conflict-title":"This changed elsewhere","today-state-empty-title":"All clear",
 "today-task-app-form-desc":"Finish your agent application details.","today-task-replace-cert-desc":"Upload a clearer copy of the rejected document.",
 "today-task-module-desc":"Complete the mandatory learning module.","today-task-urgent-desc":"A time-sensitive proposal needs your attention.",
 "today-task-followup-desc":"A customer is waiting for your follow-up.","today-task-cpd-desc":"Complete the required CPD hours to restore eligibility.",
 "today-task-respond-desc":"Respond to the open compliance case.","today-task-handover-desc":"Transfer the next customer handover item.",
 "today-agent-candidate":"Candidate workspace","today-agent-onboarding":"Onboarding workspace","today-agent-learning":"Learning workspace",
 "today-agent-cert":"Certification workspace","today-agent-active":"Active agent","today-agent-suspended":"Suspended account","today-agent-offboard":"Offboarding workspace",
}
id_ = {
 "workspace-label":"Ruang Kerja Partner",
 "footer-support":"Dukungan","footer-resources":"Sumber Daya",
 "today-page-title":"Hari Ini","today-hero-eyebrow":"Tindakan terbaik berikutnya","today-dev-tools":"Alat pengembang",
 "today-nba-fallback-desc":"Ini adalah item prioritas utama Anda saat ini.",
 "today-hero-clear-desc":"Tidak ada pekerjaan mendesak — tinjau perjalanan Anda di bawah.",
 "today-due":"Jatuh tempo",
 "today-status-open":"Terbuka","today-status-completed":"Selesai","today-status-blocked":"Diblokir","today-status-in_review":"Dalam peninjauan",
 "today-state-forbidden-title":"Akses tidak tersedia","today-state-unavailable-title":"Ruang kerja tidak tersedia",
 "today-state-conflict-title":"Ini berubah di tempat lain","today-state-empty-title":"Semua beres",
 "today-task-app-form-desc":"Selesaikan detail lamaran agen Anda.","today-task-replace-cert-desc":"Unggah salinan yang lebih jelas dari dokumen yang ditolak.",
 "today-task-module-desc":"Selesaikan modul pembelajaran wajib.","today-task-urgent-desc":"Proposal yang sensitif terhadap waktu memerlukan perhatian Anda.",
 "today-task-followup-desc":"Pelanggan menunggu tindak lanjut Anda.","today-task-cpd-desc":"Selesaikan jam CPD wajib untuk memulihkan kelayakan.",
 "today-task-respond-desc":"Tanggapi kasus kepatuhan yang terbuka.","today-task-handover-desc":"Transfer item serah terima pelanggan berikutnya.",
 "today-agent-candidate":"Ruang kerja kandidat","today-agent-onboarding":"Ruang kerja onboarding","today-agent-learning":"Ruang kerja pembelajaran",
 "today-agent-cert":"Ruang kerja sertifikasi","today-agent-active":"Agen aktif","today-agent-suspended":"Akun ditangguhkan","today-agent-offboard":"Ruang kerja offboarding",
}
for lang, keys in (("en", en), ("id", id_)):
    p = f'src/i18n/messages/{lang}.json'
    with open(p, encoding='utf-8') as f:
        d = json.load(f)
    d.update(keys)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
print('i18n ok')
