import type { ImageSourcePropType } from "react-native";

export type ArticlePart =
  | { heading: string; paragraphs: string[]; bullets?: string[]; image?: ImageSourcePropType; imageLabel?: string };

export type Article = {
  id: string;
  title: string;
  category: string;
  readingTime: string;
  image: ImageSourcePropType;
  intro: string;
  parts: ArticlePart[];
  highlight: string;
  sourceName: string;
  sourceUrl: string;
  note: string;
};

export const articles: Article[] = [
  {
    id: "balanced-diet",
    title: "Ăn uống cân bằng: bắt đầu từ những thay đổi nhỏ",
    category: "Dinh dưỡng",
    readingTime: "5 phút đọc",
    image: require("../assets/balanced_diet_banner.png"),
    intro:
      "Ăn uống lành mạnh không có nghĩa là phải thay đổi toàn bộ thực đơn ngay lập tức. Chỉ cần lựa chọn thực phẩm đa dạng hơn, tăng rau củ và điều chỉnh thói quen ăn uống, bạn đã có thể bắt đầu chăm sóc sức khỏe tốt hơn.",
    parts: [
      {
        heading: "Thế nào là ăn uống cân bằng?",
        paragraphs: [
          "Một chế độ ăn cân bằng cần cung cấp đủ năng lượng và các chất dinh dưỡng phù hợp với nhu cầu cơ thể. Bữa ăn nên có sự kết hợp của rau củ, trái cây, thực phẩm giàu tinh bột, nguồn protein và chất béo lành mạnh.",
          "Không có một thực đơn duy nhất phù hợp với tất cả mọi người. Nhu cầu dinh dưỡng còn phụ thuộc vào độ tuổi, mức độ hoạt động và tình trạng sức khỏe.",
        ],
      },
      {
        heading: "Bắt đầu từ những thay đổi nhỏ",
        paragraphs: [],
        bullets: [
          "Thêm rau xanh hoặc trái cây vào các bữa ăn hằng ngày.",
          "Ưu tiên ngũ cốc nguyên hạt khi phù hợp, chẳng hạn gạo lứt hoặc yến mạch.",
          "Giảm dần thực phẩm quá mặn, đồ uống nhiều đường và món ăn chế biến sẵn.",
        ],
      },
      {
        heading: "Một bữa ăn đơn giản có thể gồm những gì?",
        paragraphs: [
          "Ví dụ, bạn có thể kết hợp cơm, cá hoặc trứng, rau luộc và một phần trái cây. Điều quan trọng không phải là ăn thật ít, mà là lựa chọn thực phẩm đa dạng và điều chỉnh khẩu phần phù hợp.",
        ],
        image: require("../assets/balanced_diet_banner.png"),
        imageLabel: "Bữa ăn đa dạng với rau, cá và cơm",
      },
    ],
    highlight:
      "Mẹo nhỏ: Hãy thử thay đổi một thói quen trong tuần này, chẳng hạn thêm một phần rau vào bữa trưa.",
    sourceName: "World Health Organization – Healthy diet",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    note: "Thông tin mang tính tham khảo, không thay thế tư vấn y tế chuyên môn. Bài viết không đưa ra chế độ ăn điều trị bệnh cụ thể.",
  },
  {
    id: "healthy-hydration",
    title: "Uống nước thế nào cho hợp lý?",
    category: "Dinh dưỡng",
    readingTime: "3 phút đọc",
    image: require("../assets/water_bottle_daily.png"),
    intro:
      "Nước giúp cơ thể duy trì nhiều hoạt động thiết yếu, từ điều hòa nhiệt độ đến vận chuyển các chất dinh dưỡng. Uống đủ nước là một thói quen đơn giản nhưng rất quan trọng trong sinh hoạt hằng ngày.",
    parts: [
      {
        heading: "Cơ thể cần bao nhiêu nước?",
        paragraphs: [
          "Nhu cầu chất lỏng không giống nhau ở tất cả mọi người. Lượng cần thiết có thể thay đổi theo thời tiết, hoạt động thể chất, tình trạng sức khỏe và các yếu tố cá nhân.",
          "Theo hướng dẫn chung của NHS, nhiều người có thể hướng tới khoảng 6–8 cốc chất lỏng mỗi ngày. Đây không phải lượng bắt buộc cho mọi người, và một phần chất lỏng cũng đến từ thực phẩm.",
        ],
      },
      {
        heading: "Làm sao để duy trì thói quen uống nước?",
        paragraphs: [],
        bullets: [
          "Uống nước đều đặn trong ngày thay vì chờ đến khi rất khát.",
          "Mang theo bình nước khi đi học, đi làm hoặc vận động.",
          "Ưu tiên nước lọc và hạn chế đồ uống có nhiều đường.",
        ],
      },
      {
        heading: "Khi nào cần chú ý bổ sung nước?",
        paragraphs: [
          "Khi trời nóng, vận động ra nhiều mồ hôi hoặc đang bị ốm, nhu cầu chất lỏng có thể tăng. Nước tiểu vàng nhạt thường là một dấu hiệu tham khảo hữu ích, nhưng không phải cách đánh giá duy nhất.",
        ],
        image: require("../assets/water_bottle_daily.png"),
        imageLabel: "Bình nước đặt trên bàn làm việc",
      },
    ],
    highlight:
      "Mẹo nhỏ: Đặt bình nước ở vị trí dễ nhìn để nhắc bản thân uống nước thường xuyên hơn.",
    sourceName: "NHS – Water, drinks and hydration",
    sourceUrl:
      "https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/water-drinks-nutrition/",
    note: "Thông tin mang tính tham khảo, không thay thế tư vấn y tế chuyên môn. Người được bác sĩ chỉ định hạn chế dịch cần tuân theo hướng dẫn riêng.",
  },
  {
    id: "daily-walking",
    title: "Đi bộ: xây dựng thói quen vận động",
    category: "Vận động",
    readingTime: "4 phút đọc",
    image: require("../assets/walking_green_park.png"),
    intro:
      "Đi bộ là một hình thức vận động dễ tiếp cận, không đòi hỏi nhiều thiết bị và có thể thực hiện trong sinh hoạt hằng ngày. Bắt đầu bằng những khoảng thời gian ngắn là cách đơn giản để hình thành thói quen vận động lâu dài.",
    parts: [
      {
        heading: "Vì sao nên đi bộ thường xuyên?",
        paragraphs: [
          "Đi bộ nhanh có thể góp phần cải thiện sức khỏe tim mạch, hỗ trợ thể lực và giúp giảm thời gian ngồi lâu.",
          "Theo WHO, người trưởng thành nên hướng tới 150–300 phút hoạt động thể chất aerobic cường độ vừa mỗi tuần, tùy khả năng và tình trạng sức khỏe.",
        ],
      },
      {
        heading: "Bắt đầu thế nào cho dễ duy trì?",
        paragraphs: [],
        bullets: [
          "Chọn thời điểm thuận tiện như buổi sáng hoặc sau giờ học.",
          "Bắt đầu với khoảng 5–10 phút nếu bạn chưa quen vận động, sau đó tăng dần khi cảm thấy phù hợp.",
          "Chọn giày thoải mái và nơi đi bộ an toàn.",
        ],
      },
      {
        heading: "Biến đi bộ thành thói quen",
        paragraphs: [
          "Bạn có thể đi bộ trong giờ nghỉ, sử dụng cầu thang khi phù hợp hoặc đi dạo trong công viên. Những hoạt động nhỏ được duy trì đều đặn có thể giúp bạn vận động nhiều hơn theo thời gian.",
        ],
        image: require("../assets/walking_green_park.png"),
        imageLabel: "Đi bộ trên lối nhỏ trong công viên",
      },
    ],
    highlight:
      "Mẹo nhỏ: Hãy chọn một khoảng thời gian cố định trong ngày để việc đi bộ trở thành thói quen tự nhiên.",
    sourceName: "World Health Organization – Physical activity",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    note: "Thông tin mang tính tham khảo, không thay thế tư vấn y tế chuyên môn. Người có vấn đề sức khỏe ảnh hưởng đến khả năng vận động nên lựa chọn mức độ phù hợp và tham khảo chuyên gia khi cần.",
  },
];

export const articleById: Record<string, Article> = {};
for (const article of articles) articleById[article.id] = article;
