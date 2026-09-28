# Cải thiện gameplay và kiểm tra Blender

Blender 5.2.1 đã nhập các GLB vào những scene riêng và lấy dữ liệu mesh, rig,
bone cùng năm mẫu khung hình cho mỗi clip. Dùng skill
`ecc:blender-motion-state-inspection` để kiểm tra trạng thái trước khi sửa logic.

## Các thay đổi

- Tính biên chơi từ sàn nhà. Mesh `mesh277737901_1.001`, thuộc `windows.001`,
  nằm tại khoảng `(-389.5, 37826.3, -118.6)` trong Blender bị bỏ qua trong cảnh
  game. Các file GLB nguồn vẫn được giữ để có thể kiểm tra lại.
- Chọn điểm xuất phát dựa trên vùng sàn có đường đi; bụi và vết bẩn sinh trong
  vùng đó. Chướng ngại vật tránh trạm sạc và các điểm xuất phát thực tế.
- Gộp mesh nhà tĩnh theo material và dùng lưới tra cứu mesh cho tia va chạm.
  Khi tạm dừng, cảnh chỉ vẽ lại khi cần. HUD cập nhật tối đa 10 lần/giây;
  mô phỏng dùng bước thời gian 1/60 giây.
- Robot tăng/giảm tốc và xoay mượt hơn; bổ sung hiệu ứng quét/lau vì model
  robot không có rig hoặc clip hoạt ảnh. Husky nhận đúng `Gallop`; chuột phát
  các clip của rig. Những clip không phù hợp không được dùng làm idle dự phòng.
- Husky cảnh báo 0.9 giây trước khi đuổi. Va chạm trừ 10 pin với thời gian
  miễn sát thương 1.5 giây; đẩy lùi tuân thủ va chạm và biên sàn.
- Nhiệm vụ yêu cầu dọn vết bẩn, thu bụi rồi quay về trạm xanh. Kho đầy chặn
  hút thêm; đứng yên và thả dụng cụ tại trạm để sạc và đổ kho. Bụi thu rồi
  không tái sinh. HUD có tiến độ hai mục tiêu và hướng/khoảng cách đến trạm.
- Các ngày đầu có sẵn loại vết bẩn cần học; các ngày theo cốt truyện ưu tiên
  loại vết bẩn đặc trưng. Ngày 10 sinh lần lượt các loại vết bẩn khi đủ chỗ.
- Tạm dừng xóa phím đang giữ và chuyển động chuột còn chờ. Chỉ một dụng cụ
  hoạt động tại một thời điểm. Khởi động lại ngày hủy lượt sinh nhiệm vụ cũ.
- Continue khởi động lại ca hiện tại từ checkpoint đầu ngày, với pin khởi
  đầu theo điều kiện ngày đó. Vị trí bụi/vết bẩn được sinh lại.

## Kiểm tra

```powershell
npm ci
npm test
npm run build
npm run test:e2e
npm run inspect:blender
```

Nếu Chromium chưa được cài cho Playwright, chạy `npx playwright install chromium`.
Nếu Blender nằm ngoài thư mục cài đặt thông thường, đặt biến `BLENDER_PATH`
trỏ đến `blender.exe` trước khi chạy lệnh kiểm tra.

Kết quả Blender nằm trong `artifacts/blender/inspection.json` và project
`artifacts/blender/inspection.blend`. Các artifact được bỏ qua bởi Git.
Kiểm thử trình duyệt sử dụng Chromium riêng và chụp ảnh vào `test-results/`.
