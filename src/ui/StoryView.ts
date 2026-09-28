import {
  getDayStory,
  type DayReport,
  type DayStory,
} from '../systems/StorySystem';
import { SaveManager } from '../systems/SaveManager';

export function setText(id: string, text: string) {
  const element = document.getElementById(id);
  if (element && element.textContent !== text) element.textContent = text;
}
function paragraph(text: string, className = '') {
  const p = document.createElement('p');
  p.textContent = text;
  p.className = className;
  return p;
}
export function renderStory(container: HTMLElement, story: DayStory) {
  container.replaceChildren();
  story.paragraphs.forEach((text) => container.append(paragraph(text)));
  const dialogue = document.createElement('div');
  dialogue.className = 'story-dialogue';
  story.dialogue.forEach(([speaker, line]) => {
    const row = document.createElement('div');
    row.className = 'dialogue-line';
    const name = document.createElement('b');
    name.textContent = speaker;
    const words = document.createElement('span');
    words.textContent = line;
    row.append(name, words);
    dialogue.append(row);
  });
  container.append(dialogue, paragraph(story.robotNote, 'robot-note'));
}
export function showDayReport(report: DayReport) {
  const story = getDayStory(report.day);
  setText('story-day', `NGÀY ${String(report.day).padStart(2, '0')}`);
  setText('story-title', story.title);
  setText(
    'story-mood',
    `Sau ca dọn / ${story.mood === 'buồn' ? 'Một khoảng lặng' : story.mood === 'vui' ? 'Một chút vui' : 'Một chút ấm áp'}`,
  );
  setText('story-deck', story.deck);
  renderStory(document.getElementById('story-content')!, story);
  setText(
    'story-stats',
    `${report.stains} vết đã sạch · ${report.dust} hạt bụi đã thu · Pin còn ${Math.round(report.battery)}%`,
  );
  document.getElementById('story-screen')?.classList.add('active');
  document.getElementById('pause-screen')?.classList.remove('active');
  document.getElementById('next-day-btn')?.focus({ preventScroll: true });
}
export function hydrateJournal() {
  const save = SaveManager.load();
  const completed = save?.completedDays ?? [];
  const days = document.getElementById('journal-days')!;
  const entry = document.getElementById('journal-entry')!;
  const count = completed.length;
  setText(
    'journal-summary',
    count
      ? `Đã giữ lại ${count} ngày. Chọn một trang để đọc lại; những ngày chưa dọn sẽ được giữ kín.`
      : 'Hoàn thành ca dọn đầu tiên để mở trang nhật ký của gia đình.',
  );
  days.replaceChildren();
  entry.replaceChildren();
  const read = (day: number) => {
    const story = getDayStory(day);
    entry.replaceChildren();
    const tag = paragraph(
      `Ngày ${String(day).padStart(2, '0')} · ${story.mood}`,
      'eyebrow',
    );
    const title = document.createElement('h2');
    title.textContent = story.title;
    const copy = document.createElement('div');
    copy.className = 'journal-copy';
    renderStory(copy, story);
    entry.append(tag, title, paragraph(story.deck, 'story-deck'), copy);
    days
      .querySelectorAll('button')
      .forEach((button) =>
        button.setAttribute(
          'aria-current',
          String(button.dataset.day === String(day)),
        ),
      );
    entry.scrollTop = 0;
  };
  if (!count) {
    entry.className = 'journal-empty';
    const heading = document.createElement('h2');
    heading.textContent = 'Những trang chưa viết.';
    entry.append(
      heading,
      paragraph(
        'An, Minh, Bắp và Tí đang chờ bạn. Một căn nhà sạch sẽ mở ra chuyện đầu tiên.',
      ),
    );
  } else {
    entry.className = '';
    [...completed]
      .sort((a, b) => a - b)
      .forEach((day) => {
        const button = document.createElement('button');
        button.dataset.day = String(day);
        button.textContent = `Ngày ${String(day).padStart(2, '0')}`;
        const label = document.createElement('small');
        label.textContent = getDayStory(day).title;
        button.append(label);
        button.addEventListener('click', () => read(day));
        days.append(button);
      });
    read(Math.max(...completed));
  }
}
