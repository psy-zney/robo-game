export type DirtWeightMap = Record<string, number>;
export interface DayReport {
  day: number;
  stains: number;
  dust: number;
  battery: number;
  score?: number;
  stars?: number;
  maxCombo?: number;
  elapsedTime?: number;
}
export interface DayStory {
  title: string;
  mission: string;
  introStatus: string;
  mood: 'vui' | 'buồn' | 'ấm áp';
  deck: string;
  paragraphs: string[];
  dialogue: Array<[string, string]>;
  robotNote: string;
  dustColor: number;
  dirtWeights?: DirtWeightMap;
  difficultyMultiplier?: number;
  specialEvents?: string[];
}

const stories: DayStory[] = [
  /* ───────── DAY 1 ───────── */
  {
    title: 'Một thành viên mới',
    mood: 'vui',
    mission: 'Hút bụi rời và những vệt bụi khô. Về trạm khi hộp chứa đầy.',
    introStatus: 'An vừa đặt tên cho bạn: Rô. Bắp chưa đồng ý.',
    deck: 'Bắp tưởng gia đình vừa nhận nuôi một chiếc đĩa biết chạy.',
    paragraphs: [
      'An mang bạn về trong một thùng giấy, ghi lên nắp: "Trợ lý đầu tiên của tiệm bánh tương lai". Minh kiểm tra chổi quay. Bắp kiểm tra bằng cách sủa vào thùng đúng mười một lần.',
      'Sau ca dọn, sàn sạch đến mức Bắp nhìn thấy bóng mình và sủa thêm lần thứ mười hai. Tí lén tha miếng bìa làm biển "phòng riêng". An bật cười: căn nhà lâu rồi mới đông vui như vậy.',
    ],
    dialogue: [
      ['An', 'Em gọi nó là Rô nhé.'],
      ['Minh', 'Miễn đừng gọi anh là robot đời cũ.'],
      ['An', 'Đời cũ đâu có biết rửa bát.'],
    ],
    robotNote:
      'Ghi chú của Rô: gia đình có bốn người. Một người có đuôi, một người chưa chịu đăng ký hộ khẩu.',
    dustColor: 0xb5ac94,
    difficultyMultiplier: 0.8,
    dirtWeights: { Dust: 1.2, 'Thick Dust': 0.6 },
  },
  /* ───────── DAY 2 ───────── */
  {
    title: 'Cà phê nguội trên sàn',
    mood: 'buồn',
    mission: 'Giữ R để lau cà phê. Bụi khô vẫn cần hút bằng E.',
    introStatus: 'Minh làm đổ cà phê khi đọc một tin nhắn.',
    deck: 'Có những buổi sáng, một tiếng "ừ" cũng nặng.',
    paragraphs: [
      'Xưởng sửa máy thông báo cắt ca. Minh đọc đi đọc lại tin nhắn, tay vô tình hất cốc cà phê. An hỏi có chuyện gì. Anh nói "không sao", rồi đi ra ngoài với đôi giày chưa buộc dây.',
      'Khi bạn lau xong, An tìm thấy bản tính tiền mua lò bánh trong túi áo Minh. Anh đã ghi "để dành cho An" ở góc giấy. Tối ấy cô pha một cốc mới, đặt cạnh anh và ngồi xuống. Không ai vội nói.',
    ],
    dialogue: [
      ['An', 'Nếu chưa muốn kể thì mình cứ ngồi thôi.'],
      ['Minh', 'Anh sợ em phải hoãn tiệm bánh.'],
      ['An', 'Mình hoãn mua lò. Đừng hoãn nói chuyện.'],
    ],
    robotNote:
      'Ghi chú của Rô: cà phê lau được. Một ngày khó khăn thì cần thêm người ngồi cạnh.',
    dustColor: 0xada28e,
    difficultyMultiplier: 1,
    dirtWeights: { 'Coffee Spill': 1.6, Dust: 0.8, 'Thick Dust': 0.7 },
  },
  /* ───────── DAY 3 ───────── */
  {
    title: 'Vụ án sốt cà chua',
    mood: 'vui',
    mission: 'Lau sốt cà chua bằng R; hút phần bụi khô quanh bếp.',
    introStatus: 'Bắp có dấu đỏ trên mũi. Tí yêu cầu luật sư.',
    deck: 'Ba nghi phạm, một chai sốt, không ai nhận tội.',
    paragraphs: [
      'An thử bán bánh mặn từ căn bếp nhỏ. Chai sốt biến mất, rồi xuất hiện dưới bàn với một đường đỏ chạy dài tới chỗ Bắp ngủ. Minh lập "ban điều tra", dùng chiếc muỗng làm micro.',
      'Sau ca dọn, thủ phạm được tìm thấy: chính Minh đặt chai lên mép bàn lúc chụp ảnh bánh. Bắp chỉ liếm chứng cứ. Tí được tuyên trắng án, nhưng vẫn giữ chiếc bánh vụn làm phí tổn tinh thần.',
    ],
    dialogue: [
      ['Minh', 'Bắp, em có gì muốn khai không?'],
      ['An', 'Ảnh anh chụp có cả tay anh làm rơi chai kìa.'],
      ['Minh', 'Ban điều tra xin tự giải thể.'],
    ],
    robotNote:
      'Ghi chú của Rô: mũi đỏ chưa chắc có tội. Dữ liệu ảnh đáng tin hơn một tiếng gâu.',
    dustColor: 0xa99c83,
    difficultyMultiplier: 1.2,
    dirtWeights: { 'Sauce Stain': 1.3, 'Coffee Spill': 0.8, 'Thick Dust': 0.9 },
  },
  /* ───────── DAY 4 ───────── */
  {
    title: 'Dấu chân về muộn',
    mood: 'buồn',
    mission: 'Bùn cần hút E trước, rồi lau R. Đừng bỏ sót bụi rời.',
    introStatus: 'Giày Minh đầy bùn. Hôm nay anh về muộn.',
    deck: 'Một đôi giày bẩn không kể hết được một ngày dài.',
    paragraphs: [
      'Minh đi ba nơi tìm việc, rồi đạp xe về trong mưa. Anh để lại dấu bùn trên sàn và một chiếc phong bì chưa mở trên bàn. An nhìn dấu chân, tưởng anh vừa đi chơi với bạn. Hai người nói những câu ngắn mà sắc.',
      'Sàn đã sạch khi An mở phong bì: hồ sơ xin việc nhàu, kẹp cùng tờ giấy hẹn bị huỷ. Cô ra hiên mang cho Minh khăn khô. Lời xin lỗi nhỏ hơn tiếng mưa, nhưng anh nghe thấy.',
    ],
    dialogue: [
      ['An', 'Em đã đoán trước khi hỏi. Xin lỗi anh.'],
      ['Minh', 'Anh cũng không nên giấu. Hôm nay khó thật.'],
      ['An', 'Mai mình đi cùng nhé.'],
    ],
    robotNote:
      'Ghi chú của Rô: hút rồi lau là hai bước. Hỏi rồi lắng nghe cũng vậy.',
    dustColor: 0x9f947e,
    difficultyMultiplier: 1.3,
    dirtWeights: { 'Stubborn Dirt': 1.6, Dust: 0.6, 'Thick Dust': 0.6 },
  },
  /* ───────── DAY 5 ───────── */
  {
    title: 'Mẻ bánh đầu tiên',
    mood: 'vui',
    mission: 'Dọn vết bột bám: hút trước, lau nhiều lượt sau.',
    introStatus: 'Tiệm bánh tại gia có đơn đầu tiên. Cả nhà vào ca.',
    deck: 'Đơn đầu tiên: sáu chiếc bánh. Tình nguyện viên: hơi quá đông.',
    paragraphs: [
      'An nhận đơn đầu tiên từ hàng xóm. Minh cân bột bằng chiếc cân vừa sửa. Bắp nằm canh lò với vẻ rất chuyên nghiệp. Tí phụ trách "kiểm định" vụn bánh, không ai mời nhưng vẫn đến đúng giờ.',
      'Sau khi bạn dọn hết lớp bột bám, điện thoại báo khách đặt thêm mười hai chiếc. An nhảy lên. Minh nhảy theo, đập đầu vào cánh tủ. Tiệm bánh chưa có biển hiệu, nhưng đã có tiếng cười.',
    ],
    dialogue: [
      ['An', 'Khách bảo bánh ngon!'],
      ['Minh', 'Tất nhiên. Bộ phận kỹ thuật rất xuất sắc.'],
      ['An', 'Bộ phận kỹ thuật đang dán băng trên trán kìa.'],
    ],
    robotNote:
      'Ghi chú của Rô: doanh thu đầu tiên không nhiều. Số lần An cười hôm nay thì có.',
    dustColor: 0xbdb097,
    difficultyMultiplier: 1.5,
    dirtWeights: { 'Heavy Grime': 1.8, 'Stubborn Dirt': 1, 'Thick Dust': 0.7 },
  },
  /* ───────── DAY 6 ───────── */
  {
    title: 'Chiếc ghế cạnh cửa sổ',
    mood: 'buồn',
    mission: 'Dọn bùn và vết bám. Bắp bồn chồn, giữ khoảng cách khi đi qua.',
    introStatus: 'Bắp tha chiếc khăn cũ về ghế của bà Liên.',
    deck: 'Một chiếc ghế trống vẫn giữ nguyên chỗ của ai đó.',
    paragraphs: [
      'Bà Liên lên thành phố tái khám vài ngày. Bắp chưa hiểu, cứ tha chiếc khăn của bà quanh nhà rồi nằm cạnh ghế cửa sổ. An nhớ hồi tiệm bánh mới chỉ là chuyện bà kể lúc nhà mất điện.',
      'Bạn dọn xong đường bùn Bắp kéo vào. An gọi video cho bà. Bà khoẻ hơn, vẫn nhắc Minh ăn đúng bữa. Bắp nghe giọng bà, đặt cằm lên điện thoại. Tối ấy ghế vẫn trống, nhưng căn nhà bớt im.',
    ],
    dialogue: [
      ['Bà Liên', 'Bánh bán được chưa, con?'],
      ['An', 'Được rồi bà. Nhưng thiếu người nếm khó tính nhất.'],
      ['Bà Liên', 'Giữ cho bà một cái. Đừng để Bắp nếm hộ.'],
    ],
    robotNote:
      'Ghi chú của Rô: hôm nay Bắp chạy nhiều vì nhớ. Máy không đo được loại khoảng cách này.',
    dustColor: 0x9e927a,
    difficultyMultiplier: 1.6,
    dirtWeights: {
      'Heavy Grime': 1.4,
      'Stubborn Dirt': 1.2,
      'Sauce Stain': 0.8,
      'Coffee Spill': 0.6,
    },
    specialEvents: ['husky_aggressive'],
  },
  /* ───────── DAY 7 ───────── */
  {
    title: 'Sinh nhật không có nến',
    mood: 'vui',
    mission: 'Ưu tiên lau đồ uống; hút rồi lau các vệt bám.',
    introStatus: 'An tổ chức một bữa sinh nhật bí mật cho Minh.',
    deck: 'Nến hết. Đèn pin còn. Tạm gọi là sinh nhật phiên bản xưởng.',
    paragraphs: [
      'An giấu chiếc bánh sinh nhật trong tủ. Minh mở đúng tủ đó để tìm tua vít. Bất ngờ thất bại sớm, nhưng tiệc vẫn bắt đầu. Hàng xóm mang nước trái cây; Bắp mang chiếc tất mất tích từ tháng trước.',
      'Sàn sạch trở lại, cả nhà bật đèn pin thay nến. Minh nhận cuộc gọi: một cửa hàng nhỏ muốn anh thử việc sửa máy. Anh cười lâu hơn bình thường. An bảo lời ước đã được giao sớm.',
    ],
    dialogue: [
      ['Minh', 'Anh ước cái gì bây giờ?'],
      ['An', 'Ước bớt giấu tua vít trong tủ bánh.'],
      ['Minh', 'Khó hơn tìm việc đấy.'],
    ],
    robotNote: 'Ghi chú của Rô: đèn pin không thổi tắt được. Minh vẫn thử.',
    dustColor: 0xad9f87,
    difficultyMultiplier: 1.7,
    dirtWeights: {
      'Coffee Spill': 2,
      'Heavy Grime': 1.2,
      'Stubborn Dirt': 0.8,
    },
  },
  /* ───────── DAY 8 ───────── */
  {
    title: 'Chiếc hộp trên gác',
    mood: 'buồn',
    mission: 'Hút lớp bụi dày sau khi sửa góc làm bánh.',
    introStatus: 'Dọn góc bếp mới làm rơi một chiếc hộp cũ.',
    deck: 'Có thứ cất lâu đến mức người ta tưởng mình đã quên.',
    paragraphs: [
      'Minh đóng thêm kệ cho góc làm bánh. Trên gác rơi xuống hộp ảnh cũ: mẹ An đứng trước một cửa tiệm nhỏ, tay cầm chiếc bánh cháy cạnh. An im lặng. Cô từng nghĩ mở tiệm sẽ khiến mình bớt nhớ mẹ.',
      'Bạn hút hết bụi dưới kệ. An chọn một tấm ảnh đặt lên trên, cạnh cuốn sổ công thức của bà Liên. Minh không nói "đừng buồn". Anh đóng thêm một móc nhỏ để treo chiếc tạp dề của mẹ.',
    ],
    dialogue: [
      ['An', 'Em sợ mình làm không ngon bằng mẹ.'],
      ['Minh', 'Anh nghĩ mẹ sẽ muốn được ăn bánh em làm. Kể cả cháy cạnh.'],
    ],
    robotNote:
      'Ghi chú của Rô: giữ một tấm ảnh không làm nhà bừa hơn. Đừng hút đi mọi thứ cũ.',
    dustColor: 0xc0b397,
    difficultyMultiplier: 1.8,
    dirtWeights: { 'Thick Dust': 2.2, Dust: 1.5, 'Stubborn Dirt': 0.5 },
  },
  /* ───────── DAY 9 ───────── */
  {
    title: 'Cả nhà trú mưa',
    mood: 'vui',
    mission: 'Pin bắt đầu ở 70%. Ghé trạm sạc giữa ca và dọn vết bùn.',
    introStatus: 'Minh chuyển trạm sạc. Pin chỉ kịp nạp đến 70%.',
    deck: 'Mưa to. Mái dột. Tí bất ngờ có một chiếc thuyền.',
    paragraphs: [
      'Cơn mưa làm cửa sổ rò nước. Minh kê chậu hứng, An chuyển bánh lên cao, Bắp bận đuổi bóng mình trong vũng nước. Một chiếc nắp hộp trôi ngang: Tí ngồi trên đó, mặt nghiêm như thuyền trưởng.',
      'Sau ca dọn, mái được vá tạm và bánh vẫn khô. Bà Liên gọi báo mai sẽ về. An đặt thêm một chiếc bát trên bàn. Minh treo chiếc nắp hộp lên cao; Tí phản đối bằng cách lấy trộm một vụn bánh.',
    ],
    dialogue: [
      ['An', 'Thuyền trưởng Tí, yêu cầu lên bờ!'],
      ['Minh', 'Nó đang tính phí cứu hộ đấy.'],
      ['An', 'Trả bằng vụn bánh. Một chuyến thôi.'],
    ],
    robotNote:
      'Ghi chú của Rô: pin có thể nạp lại. Tinh thần cũng vậy, nếu cả nhà cùng hứng một chậu nước.',
    dustColor: 0x9d917b,
    difficultyMultiplier: 1.9,
    dirtWeights: {
      'Heavy Grime': 1.8,
      'Stubborn Dirt': 1.5,
      'Coffee Spill': 1.2,
    },
    specialEvents: ['reduced_battery'],
  },
  /* ───────── DAY 10 ───────── */
  {
    title: 'Một chỗ để trở về',
    mood: 'ấm áp',
    mission: 'Dọn đủ các loại vết bẩn. Pin 70%, Bắp rất phấn khích.',
    introStatus: 'Bà Liên về nhà. Buổi mở bán nhỏ cũng bắt đầu.',
    deck: 'Căn nhà hôm nay bừa nhất. Cũng đủ người nhất.',
    paragraphs: [
      'Bà Liên trở về đúng buổi mở bán bánh tại nhà. Bột, cà phê và dấu giày nối nhau qua sàn. Bắp chạy theo bà như sợ bà đi mất. Minh mặc chiếc áo đi làm mới, còn An run tay khi treo biển "Bánh của An".',
      'Bạn về trạm khi vết cuối cùng đã sạch. Bà nếm bánh, chê hơi ngọt rồi ăn hết. An nhìn bức ảnh mẹ trên kệ và khóc một chút. Minh nắm tay cô. Tiệm chưa lớn, cuộc sống chưa hết khó, nhưng mỗi người đều có chỗ của mình ở đây.',
    ],
    dialogue: [
      ['Bà Liên', 'Ngọt quá. Mai bớt một chút nhé.'],
      ['An', 'Bà ăn cái thứ hai rồi đấy.'],
      ['Bà Liên', 'Bà kiểm tra lại cho chắc.'],
    ],
    robotNote:
      'Ghi chú của Rô: hoàn thành mười ca dọn. Nhiệm vụ mới: ở lại. Ngày mai nhà vẫn có chuyện.',
    dustColor: 0xab9c82,
    difficultyMultiplier: 2,
    dirtWeights: {
      'Heavy Grime': 1.5,
      'Stubborn Dirt': 1.3,
      'Sauce Stain': 1,
      'Coffee Spill': 1,
      'Thick Dust': 0.8,
      Dust: 0.5,
    },
    specialEvents: ['husky_aggressive', 'reduced_battery'],
  },

  /* ═══════════════════════════════════════════════════════════════
   *  CHAPTER 2 — Days 11‒20: "Tiệm bánh lớn dần"
   * ═══════════════════════════════════════════════════════════════ */

  /* ───────── DAY 11 ───────── */
  {
    title: 'Đơn bánh xa nhất',
    mood: 'vui',
    mission: 'Hộp chứa nhỏ hơn (10). Về trạm đổ bụi thường xuyên.',
    introStatus: 'Một đơn hàng từ bên kia sông. Bắp xung phong giao.',
    deck: 'Khoảng cách xa nhất Bắp từng đi: từ bếp ra cổng.',
    paragraphs: [
      'An nhận đơn từ một quán cà phê nhỏ bên kia cầu. Minh tình nguyện chạy xe, nhưng Bắp cứ ngồi chắn đúng cổng, đuôi vẫy như cánh quạt đến khi được leo lên yên sau. Tí nhìn theo với vẻ mặt "ta không thèm đi".',
      'Khi hai người trở về, quán cà phê đã đặt thêm hai đợt. An xoa tay, mắt sáng hơn bóng đèn bếp. Minh lẳng lặng ghi thêm một dòng vào cuốn sổ tay nhỏ mà anh không cho ai đọc.',
    ],
    dialogue: [
      ['Minh', 'Bắp tưởng đi chơi chứ không đi giao.'],
      ['An', 'Chí ít nó giữ bánh không rơi. Bằng cách ngồi lên.'],
      ['Minh', '…Đó chính xác là vấn đề.'],
    ],
    robotNote: 'Ghi chú của Rô: hộp chứa nhỏ thì về trạm nhiều hơn. Giống người — đi xa rồi phải biết đường về.',
    dustColor: 0xb0a58d,
    difficultyMultiplier: 2.1,
    dirtWeights: { 'Thick Dust': 1.6, Dust: 1.2, 'Coffee Spill': 1.0 },
    specialEvents: ['small_storage'],
  },
  /* ───────── DAY 12 ───────── */
  {
    title: 'Ca đêm của robot',
    mood: 'buồn',
    mission: 'Nhà tối. Tầm nhìn hạn chế. Dọn cẩn thận, đừng đâm vào đồ.',
    introStatus: 'Cả nhà ngủ sớm. Chỉ còn Rô và tiếng mưa.',
    deck: 'Có những đêm, im lặng cũng là một loại bầu bạn.',
    paragraphs: [
      'Hôm nay An mệt vì giao hai đợt bánh. Minh đau lưng sau một ngày sửa máy. Cả nhà tắt đèn lúc chín giờ. Bắp cuộn tròn dưới bàn, Tí biến mất trong góc tối quen thuộc.',
      'Bạn dọn trong bóng tối chỉ với ánh đèn nhỏ từ trạm sạc. Khi ca xong, An lật mình trong giấc ngủ và lẩm bẩm "cảm ơn". Có thể cô mơ, có thể không. Rô ghi lại cả hai trường hợp.',
    ],
    dialogue: [
      ['An', '(ngủ mơ) …thêm bơ…'],
      ['Minh', '(ngáy nhẹ)'],
    ],
    robotNote: 'Ghi chú của Rô: nhà tối nhưng sàn vẫn bẩn. Có thứ không cần ánh sáng để biết mình cần làm gì.',
    dustColor: 0x88806e,
    difficultyMultiplier: 2.2,
    dirtWeights: { 'Stubborn Dirt': 1.5, 'Heavy Grime': 1.3, Dust: 0.8 },
    specialEvents: ['dim_room'],
  },
  /* ───────── DAY 13 ───────── */
  {
    title: 'Chiếc lò mới',
    mood: 'vui',
    mission: 'Bụi xây dựng rất dày. Pin tiêu nhanh hơn. Combo giúp đỡ!',
    introStatus: 'Minh lắp xong chiếc lò mới. Bụi bay khắp nhà.',
    deck: 'Lắp lò mất ba tiếng. Dọn bụi lò mất cả ca.',
    paragraphs: [
      'Minh mang về chiếc lò cũ từ xưởng, đã sửa lại hoàn toàn. An không tin mắt mình — nó đúng loại bà Liên từng nhắc. Quá trình lắp đặt tạo ra một đám mây bụi vĩ đại mà Bắp hít một hơi rồi hắt xì liền ba phát.',
      'Sau ca dọn, An thử nướng mẻ đầu tiên trong lò mới. Mùi bơ lan ra khắp nhà. Bà Liên nhắn: "Bà ngửi thấy rồi". Tí xuất hiện đúng lúc mẻ bánh ra lò, hoàn toàn không phải trùng hợp.',
    ],
    dialogue: [
      ['An', 'Anh sửa lò này lâu chưa?'],
      ['Minh', 'Hai tháng. Xin đừng hỏi tiền phụ tùng.'],
      ['An', '…Em sẽ trả bằng bánh. Nhiều bánh.'],
    ],
    robotNote: 'Ghi chú của Rô: bụi lò khó hút hơn bụi thường. Nhưng mùi bánh sau đó làm cảm biến rất vui.',
    dustColor: 0xc4b89c,
    difficultyMultiplier: 2.3,
    dirtWeights: { 'Thick Dust': 2.5, 'Heavy Grime': 1.5, Dust: 1.0, 'Stubborn Dirt': 0.8 },
    specialEvents: ['fast_drain'],
  },
  /* ───────── DAY 14 ───────── */
  {
    title: 'Cuộc đua dọn nhà',
    mood: 'vui',
    mission: 'Speed run! Robot nhanh hơn, sạc nhanh hơn. Hoàn thành thật nhanh!',
    introStatus: 'Khách đến trong 5 phút. An: "DỌN! DỌN! DỌN!"',
    deck: 'Tốc độ là nghệ thuật. Hoảng loạn cũng vậy.',
    paragraphs: [
      'An nhận tin khách sẽ đến xem tiệm sớm hơn dự kiến. Minh chạy cất đồ, Bắp chạy theo vì tưởng là trò chơi mới, Tí lẩn đi với vẻ bất mãn vì bị phá giấc.',
      'Bạn chưa bao giờ dọn nhanh đến vậy. Khi khách bước vào, sàn sáng bóng, An cười tươi dù mồ hôi vẫn chưa khô. Khách bảo: "Nhà sạch quá, chắc robot giỏi lắm". Minh nháy mắt với bạn.',
    ],
    dialogue: [
      ['An', 'CÒN BA PHÚT!'],
      ['Minh', 'Em la to hơn máy hút bụi.'],
      ['An', 'VÌ MÁY KHÔNG BIẾT HOẢNG!'],
    ],
    robotNote: 'Ghi chú của Rô: hôm nay chạy nhanh nhất kể từ ngày mở hộp. Hiệu suất: xuất sắc. Pin: gần tàn.',
    dustColor: 0xa89b85,
    difficultyMultiplier: 2.0,
    dirtWeights: { Dust: 1.5, 'Coffee Spill': 1.2, 'Thick Dust': 1.0 },
    specialEvents: ['speed_boost', 'fast_charge'],
  },
  /* ───────── DAY 15 ───────── */
  {
    title: 'Bắp ốm',
    mood: 'buồn',
    mission: 'Bắp nằm yên nhưng vết bẩn nhiều hơn. Cẩn thận với vết bám dày.',
    introStatus: 'Bắp bỏ ăn sáng. Cả nhà lo lắng.',
    deck: 'Một con chó im lặng đáng lo hơn mười con chó sủa.',
    paragraphs: [
      'Bắp không chạy đón cửa. Không sủa khi Minh mở tủ lạnh. Không tranh giành vụn bánh với Tí. An ôm nó, đo nhiệt. Minh gọi bác sĩ thú y, giọng bình tĩnh nhưng tay run.',
      'Bạn dọn nhà thật nhẹ nhàng quanh chỗ Bắp nằm. Bác sĩ bảo chỉ cần nghỉ ngơi. Tối ấy Tí lần đầu nằm cạnh Bắp mà không bị đuổi. An nấu cháo cho cả nhà, bao gồm cả Rô — dù Rô không ăn được.',
    ],
    dialogue: [
      ['An', 'Con có đau không, Bắp?'],
      ['Minh', 'Nó liếm tay em là dấu hiệu tốt rồi.'],
      ['Bà Liên', 'Cho nó uống nước ấm. Hồi xưa bà cũng hay bị.'],
    ],
    robotNote: 'Ghi chú của Rô: hôm nay dọn nhẹ tay hơn. Một cơ thể nhỏ cần được nghỉ, kể cả Bắp.',
    dustColor: 0x9b8f79,
    difficultyMultiplier: 2.4,
    dirtWeights: { 'Heavy Grime': 2.0, 'Stubborn Dirt': 1.5, 'Coffee Spill': 1.0, 'Sauce Stain': 0.8 },
    specialEvents: ['extra_stains'],
  },
  /* ───────── DAY 16 ───────── */
  {
    title: 'Đêm mất điện',
    mood: 'buồn',
    mission: 'Nhà rất tối, hộp chứa nhỏ (8). Dùng outline giúp nhận diện vết bẩn.',
    introStatus: 'Điện cắt lúc nửa đêm. Bếp lò nguội, bánh phải chờ.',
    deck: 'Mất điện thì không thấy đường. Nhưng cả nhà vẫn tìm thấy nhau.',
    paragraphs: [
      'Sấm đánh bay cầu chì. Minh mò mẫm tìm hộp cầu chì bằng đèn điện thoại. An gom nến, bà Liên kể chuyện hồi xưa cả xóm mất điện đến sáng. Bắp (đã khoẻ hơn) sủa vào bóng tối, rất dũng cảm, rất vô ích.',
      'Bạn dọn nhà dưới ánh nến. Khi điện trở lại, mọi người chớp mắt nhìn nhau và cười — vì ai cũng bẩn hơn lúc mất điện. An bảo: "Bữa sau mất điện, mình cứ ngồi yên là sạch nhất."',
    ],
    dialogue: [
      ['Bà Liên', 'Hồi xưa mất điện là cả xóm ra hiên nói chuyện.'],
      ['An', 'Giờ cả xóm bật đèn pin soi vào nhau.'],
      ['Minh', 'Đèn pin cũng hết. Anh đang dùng màn hình laptop.'],
    ],
    robotNote: 'Ghi chú của Rô: cảm biến hồng ngoại vẫn hoạt động. Nhưng thiếu điện thì ai cũng bình đẳng trước bóng tối.',
    dustColor: 0x7d7565,
    difficultyMultiplier: 2.5,
    dirtWeights: { 'Stubborn Dirt': 1.8, Dust: 1.2, 'Thick Dust': 1.4, 'Heavy Grime': 1.0 },
    specialEvents: ['dim_room', 'small_storage'],
  },
  /* ───────── DAY 17 ───────── */
  {
    title: 'Ngày hội chợ xóm',
    mood: 'vui',
    mission: 'Rất nhiều vết bẩn! Sạc chậm hơn. Giữ combo để kiếm điểm cao.',
    introStatus: 'Hội chợ xóm kéo vào nhà. Sàn bếp thành chiến trường.',
    deck: 'Mời cả xóm ăn bánh. Mời xong mới nhìn xuống sàn.',
    paragraphs: [
      'An dọn bàn ngoài sân cho hội chợ mini. Hàng xóm mang đồ ăn đến, trẻ con chạy qua bếp, Bắp đón khách bằng cách liếm tất cả mọi người. Sàn nhà trở thành bản đồ chiến trường với đủ loại vết.',
      'Khi mọi người ra về, An và Minh đứng nhìn sàn. Im lặng ba giây. Rồi cả hai cùng nói: "Rô, giúp với!" Sau ca dọn, An nói đây là ngày vui nhất từ khi mở tiệm. Minh đồng ý, dù mệt đến mức ngủ gục trên ghế.',
    ],
    dialogue: [
      ['Hàng xóm', 'Bánh nhà An ngon quá!'],
      ['An', 'Cảm ơn cô! Dạ có thêm sốt cà—'],
      ['Minh', '(thì thào) Em đừng nhìn xuống sàn.'],
    ],
    robotNote: 'Ghi chú của Rô: hôm nay nhiều người nhất. Bụi cũng nhiều nhất. Nhưng tiếng cười đã phủ kín mọi vết bẩn.',
    dustColor: 0xb5a78f,
    difficultyMultiplier: 2.6,
    dirtWeights: {
      'Coffee Spill': 1.8,
      'Sauce Stain': 1.6,
      'Heavy Grime': 1.4,
      'Stubborn Dirt': 1.2,
      'Thick Dust': 1.0,
      Dust: 0.8,
    },
    specialEvents: ['extra_stains', 'slow_charge'],
  },
  /* ───────── DAY 18 ───────── */
  {
    title: 'Bức thư cũ',
    mood: 'buồn',
    mission: 'Vết bám dày và nhiều bùn. Robot chậm hơn do nhiều chướng ngại.',
    introStatus: 'Dọn tủ cũ, An tìm thấy thư mẹ viết.',
    deck: 'Có những lá thư chờ đúng người, đúng lúc.',
    paragraphs: [
      'An dọn chiếc tủ cũ để kê thêm kệ bánh. Trong ngăn kéo dưới cùng, cô tìm thấy một lá thư mẹ viết cho cô trước khi mất — bà dặn An mở khi nào mở tiệm. Cô đọc đi đọc lại, mỗi lần mắt lại đỏ thêm.',
      'Minh không nói gì, chỉ đi pha trà. Bà Liên ngồi cạnh An, xoa lưng như cô còn nhỏ. Bắp lặng lẽ đặt đầu lên đùi An. Bạn dọn xong sàn và lùi về góc. Có những lúc, ở đúng chỗ là đủ.',
    ],
    dialogue: [
      ['An', 'Mẹ viết: "Con sẽ làm được. Mẹ tin."'],
      ['Bà Liên', 'Mẹ con nói đúng rồi, con.'],
    ],
    robotNote: 'Ghi chú của Rô: hôm nay ít hút bụi hơn nhưng ca dọn quan trọng nhất. Có thứ sạch không cần chổi.',
    dustColor: 0x948a76,
    difficultyMultiplier: 2.7,
    dirtWeights: { 'Stubborn Dirt': 2.0, 'Heavy Grime': 1.8, 'Thick Dust': 1.2 },
    specialEvents: ['slow_robot', 'extra_stains'],
  },
  /* ───────── DAY 19 ───────── */
  {
    title: 'Cơn bão lớn',
    mood: 'buồn',
    mission: 'Pin tiêu nhanh hơn 50%. Nhà tối. Dọn nhanh trước khi hết pin!',
    introStatus: 'Bão số 3 đổ bộ. Mái dột, cửa sổ rung.',
    deck: 'Bão thì sẽ qua. Mái thì cần vá. Bánh thì phải nướng.',
    paragraphs: [
      'Gió giật mạnh khiến cửa sổ bung chốt. Nước tràn vào, kéo theo bụi và lá. Minh vội vàng chèn ván, An ôm Bắp — con chó sợ sấm đến mức quên cả sủa. Bà Liên bình thản ngồi đan, nói: "Hồi trước có trận hơn thế."',
      'Bạn dọn nhà trong gió và mưa hắt. Pin tiêu nhanh vì cảm biến phải hoạt động tối đa. Khi bão qua, cả nhà ngồi quanh bàn ăn mì gói, ánh nến lung linh. An nói nhỏ: "Nhà còn, mình còn."',
    ],
    dialogue: [
      ['Minh', 'Mai anh sẽ vá mái.'],
      ['An', 'Anh nói vậy ba lần rồi.'],
      ['Minh', 'Lần này có bão ép.'],
      ['Bà Liên', 'Lần trước cũng vậy, cháu.'],
    ],
    robotNote: 'Ghi chú của Rô: cảm biến ghi nhận gió cấp 9. Cảm biến cũng ghi nhận: cả nhà vẫn cười trong bão.',
    dustColor: 0x857b69,
    difficultyMultiplier: 2.8,
    dirtWeights: {
      'Heavy Grime': 2.2,
      'Stubborn Dirt': 1.8,
      'Sauce Stain': 1.0,
      'Coffee Spill': 0.8,
    },
    specialEvents: ['fast_drain', 'dim_room', 'husky_aggressive'],
  },
  /* ───────── DAY 20 ───────── */
  {
    title: 'Biển hiệu mới',
    mood: 'ấm áp',
    mission: 'Thử thách cuối cùng: mọi thứ khó nhất. Sạc chậm, hộp nhỏ, vết nhiều.',
    introStatus: 'Biển hiệu "Bánh của An" chính thức treo trước cửa.',
    deck: 'Hai mươi ngày. Một tiệm bánh. Một gia đình. Một robot nhỏ rất bận.',
    paragraphs: [
      'Minh mang về tấm biển hiệu sơn tay: "Bánh của An — Nướng bằng tình yêu, dọn bằng robot". An cười đến chảy nước mắt. Bà Liên chỉnh lại chữ "robot" thành "Rô" bằng bút lông. Bắp ngồi nghiêm trang như đang dự lễ khai trương — vì bên cạnh có khay bánh.',
      'Hôm nay nhà bừa nhất, nhưng cũng đông vui nhất. Bạn dọn xong ca cuối cùng của chương hai. Khi về trạm, An quỳ xuống nói với Rô: "Cảm ơn nhé. Ngày mai lại bẩn, nhưng mình sẽ lại dọn." Tí gật đầu từ xa. Bắp liếm ống kính camera của bạn. Mọi thứ đều tốt.',
    ],
    dialogue: [
      ['An', 'Tiệm chính thức mở rồi!'],
      ['Minh', 'Rô có muốn cổ phần không?'],
      ['Bà Liên', 'Nó đã có cổ phần từ ngày đầu tiên rồi, cháu.'],
    ],
    robotNote: 'Ghi chú cuối chương 2: hai mươi ca dọn. Ba trăm sáu mươi vết bẩn. Một gia đình. Số liệu cuối cùng: đáng.',
    dustColor: 0xa49680,
    difficultyMultiplier: 3.0,
    dirtWeights: {
      'Heavy Grime': 2.0,
      'Stubborn Dirt': 1.5,
      'Sauce Stain': 1.3,
      'Coffee Spill': 1.2,
      'Thick Dust': 1.0,
      Dust: 0.8,
    },
    specialEvents: ['extra_stains', 'slow_charge', 'small_storage', 'husky_aggressive', 'reduced_battery'],
  },
];

export function getDayStory(day: number): DayStory {
  const safeDay = Math.max(1, Math.floor(day));
  if (safeDay <= stories.length) return stories[safeDay - 1]!;
  // Life goes on after the authored chapters; daily moods continue alternating.
  const source =
    stories[
      safeDay % 2 === 1
        ? safeDay % 3 === 0
          ? 6
          : 2
        : safeDay % 4 === 0
          ? 7
          : 3
    ]!;
  return {
    ...source,
    title: safeDay % 2 ? 'Chuyện nhỏ trong nhà' : 'Một ngày chậm hơn',
    mission:
      'Dọn vết bẩn, thu bụi rời rồi trở lại trạm. Chăm nhà là việc mỗi ngày.',
    introStatus:
      'Một ngày mới ở tiệm bánh. Cả nhà đã quen với tiếng chổi của Rô.',
    deck:
      safeDay % 2
        ? 'Niềm vui đôi khi chỉ là một khay bánh không cháy.'
        : 'Sau những ngày náo nhiệt, ai cũng cần được nghỉ.',
    paragraphs:
      safeDay % 2
        ? [
            'Đơn bánh lại tới. Minh viết tên khách lên túi, Bắp ngủ ngay chỗ cần đứng, còn Tí tiếp tục nghề kiểm định không lương. An vừa làm vừa kể chuyện khách gọi chiếc bánh méo là "phiên bản giới hạn".',
            'Bạn dọn xong khi cả nhà chia chiếc bánh cuối. Bà Liên vẫn chê hơi ngọt. Lần này An cười trước khi bà kịp lấy chiếc thứ hai.',
          ]
        : [
            'An nhận một lời chê bánh, Minh sửa mãi một chiếc máy không chịu chạy. Hai người đều mệt nên bữa tối ít tiếng nói. Bắp nằm yên cạnh bàn, hiếm khi biết chọn đúng lúc đến thế.',
            'Khi sàn sạch, Minh kéo ghế ngồi cùng An. Họ quyết định nghỉ sớm và thử lại vào mai. Có những ngày, chăm sóc nhau chỉ là không bắt ai phải vui ngay.',
          ],
    dialogue:
      safeDay % 2
        ? [
            ['An', 'Mai em làm thêm bánh méo nhé?'],
            ['Minh', 'Nhớ tăng giá bản giới hạn.'],
          ]
        : [
            ['Minh', 'Hôm nay mình nghỉ nhé.'],
            ['An', 'Ừ. Mai rồi tính.'],
          ],
    robotNote:
      safeDay % 2
        ? 'Ghi chú của Rô: nhà bừa trở lại là dấu hiệu mọi người đang sống.'
        : 'Ghi chú của Rô: không phải ngày nào cũng cần một chiến thắng.',
    difficultyMultiplier: Math.min(3, 2 + Math.floor((safeDay - 10) / 5) * 0.3),
    specialEvents: [
      ...(safeDay >= 15 && safeDay % 3 === 0 ? ['husky_aggressive'] : []),
      ...(safeDay >= 20 && safeDay % 4 === 0 ? ['reduced_battery'] : []),
      ...(safeDay >= 25 && safeDay % 5 === 0 ? ['dim_room'] : []),
      ...(safeDay >= 30 && safeDay % 6 === 0 ? ['fast_drain'] : []),
    ],
  };
}
export function getDifficultyMultiplier(day: number) {
  return getDayStory(day).difficultyMultiplier ?? 1;
}
export function hasSpecialEvent(day: number, event: string) {
  return getDayStory(day).specialEvents?.includes(event) ?? false;
}
