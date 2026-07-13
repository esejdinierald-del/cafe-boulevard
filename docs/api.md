# Edge Functions

| Emri | Verify JWT | Përshkrim |
|------|-----------|-----------|
| `pos-create-order` | false | Krijon pos_orders open |
| `pos-confirm-order` | false | Konfirmim banaku + dekrement stoku + transaction sale |
| `pos-close-order` | false | Rezervë (mbyllje) |
| `pos-cancel-item` | false | Anulim artikulli me passcode admin |
| `verify-staff-pin` | false | Verifikim PIN kamarieri |
| `manage-shift` | false | Menaxhim turni + validim QR |
| `manage-shift-turn` | false | CRUD shift_turns (service_role) |
| `manage-inv-product` | false | CRUD inv_products |
| `scan-mulliri` | false | OCR foto mulliri (Gemini) |
| `staff-chat` | false | Chat AI për stafin |
| `send-push` | false | Web Push (VAPID) |
