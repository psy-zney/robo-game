export type DirtWeightMap = Record<string, number>;
export interface DayReport {
  day: number;
  stains: number;
  dust: number;
  battery: number;
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
  {
    title: 'Một thành viên mới',
    mood: 'vui',
    mission: 'Hút bụi rời và những vệt bụi khô. Về trạm khi hộp chứa đầy.',
    introStatus: 'An vừa đặt tên cho bạn: Rô. Bắp chưa đồng ý.',
    deck: 'Bắp tưởng gia đình vừa nhận nuôi một chiếc đĩa biết chạy.',
    paragraphs: [
      'An mang bạn về trong một thùng giấy, ghi lên nắp: “Trợ lý đầu tiên của tiệm bánh tương lai”. Minh kiểm tra chổi quay. Bắp kiểm tra bằng cách sủa vào thùng đúng mười một lần.',
      'Sau ca dọn, sàn sạch đến mức Bắp nhìn thấy bóng mình và sủa thêm lần thứ mười hai. Tí lén tha miếng bìa làm biển “phòng riêng”. An bật cười: căn nhà lâu rồi mới đông vui như vậy.',
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
  {
    title: 'Cà phê nguội trên sàn',
    mood: 'buồn',
    mission: 'Giữ R để lau cà phê. Bụi khô vẫn cần hút bằng E.',
    introStatus: 'Minh làm đổ cà phê khi đọc một tin nhắn.',
    deck: 'Có những buổi sáng, một tiếng “ừ” cũng nặng.',
    paragraphs: [
      'Xưởng sửa máy thông báo cắt ca. Minh đọc đi đọc lại tin nhắn, tay vô tình hất cốc cà phê. An hỏi có chuyện gì. Anh nói “không sao”, rồi đi ra ngoài với đôi giày chưa buộc dây.',
      'Khi bạn lau xong, An tìm thấy bản tính tiền mua lò bánh trong túi áo Minh. Anh đã ghi “để dành cho An” ở góc giấy. Tối ấy cô pha một cốc mới, đặt cạnh anh và ngồi xuống. Không ai vội nói.',
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
  {
    title: 'Vụ án sốt cà chua',
    mood: 'vui',
    mission: 'Lau sốt cà chua bằng R; hút phần bụi khô quanh bếp.',
    introStatus: 'Bắp có dấu đỏ trên mũi. Tí yêu cầu luật sư.',
    deck: 'Ba nghi phạm, một chai sốt, không ai nhận tội.',
    paragraphs: [
      'An thử bán bánh mặn từ căn bếp nhỏ. Chai sốt biến mất, rồi xuất hiện dưới bàn với một đường đỏ chạy dài tới chỗ Bắp ngủ. Minh lập “ban điều tra”, dùng chiếc muỗng làm micro.',
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
  {
    title: 'Mẻ bánh đầu tiên',
    mood: 'vui',
    mission: 'Dọn vết bột bám: hút trước, lau nhiều lượt sau.',
    introStatus: 'Tiệm bánh tại gia có đơn đầu tiên. Cả nhà vào ca.',
    deck: 'Đơn đầu tiên: sáu chiếc bánh. Tình nguyện viên: hơi quá đông.',
    paragraphs: [
      'An nhận đơn đầu tiên từ hàng xóm. Minh cân bột bằng chiếc cân vừa sửa. Bắp nằm canh lò với vẻ rất chuyên nghiệp. Tí phụ trách “kiểm định” vụn bánh, không ai mời nhưng vẫn đến đúng giờ.',
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
  {
    title: 'Chiếc hộp trên gác',
    mood: 'buồn',
    mission: 'Hút lớp bụi dày sau khi sửa góc làm bánh.',
    introStatus: 'Dọn góc bếp mới làm rơi một chiếc hộp cũ.',
    deck: 'Có thứ cất lâu đến mức người ta tưởng mình đã quên.',
    paragraphs: [
      'Minh đóng thêm kệ cho góc làm bánh. Trên gác rơi xuống hộp ảnh cũ: mẹ An đứng trước một cửa tiệm nhỏ, tay cầm chiếc bánh cháy cạnh. An im lặng. Cô từng nghĩ mở tiệm sẽ khiến mình bớt nhớ mẹ.',
      'Bạn hút hết bụi dưới kệ. An chọn một tấm ảnh đặt lên trên, cạnh cuốn sổ công thức của bà Liên. Minh không nói “đừng buồn”. Anh đóng thêm một móc nhỏ để treo chiếc tạp dề của mẹ.',
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
  {
    title: 'Một chỗ để trở về',
    mood: 'ấm áp',
    mission: 'Dọn đủ các loại vết bẩn. Pin 70%, Bắp rất phấn khích.',
    introStatus: 'Bà Liên về nhà. Buổi mở bán nhỏ cũng bắt đầu.',
    deck: 'Căn nhà hôm nay bừa nhất. Cũng đủ người nhất.',
    paragraphs: [
      'Bà Liên trở về đúng buổi mở bán bánh tại nhà. Bột, cà phê và dấu giày nối nhau qua sàn. Bắp chạy theo bà như sợ bà đi mất. Minh mặc chiếc áo đi làm mới, còn An run tay khi treo biển “Bánh của An”.',
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
];

export function getDayStory(day: number): DayStory {
  const safeDay = Math.max(1, Math.floor(day));
  if (safeDay <= stories.length) return stories[safeDay - 1]!;
  // Life goes on after the authored first chapter; daily moods continue alternating.
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
            'Đơn bánh lại tới. Minh viết tên khách lên túi, Bắp ngủ ngay chỗ cần đứng, còn Tí tiếp tục nghề kiểm định không lương. An vừa làm vừa kể chuyện khách gọi chiếc bánh méo là “phiên bản giới hạn”.',
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
    ],
  };
}
export function getDifficultyMultiplier(day: number) {
  return getDayStory(day).difficultyMultiplier ?? 1;
}
export function hasSpecialEvent(day: number, event: string) {
  return getDayStory(day).specialEvents?.includes(event) ?? false;
}
