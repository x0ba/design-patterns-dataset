import { LEXICON } from './lexicon';
import { PartOfSpeech, type MergedToken } from '../../src/types/subtitle';

export interface LexEntry {
  headword: string;
  reading: string;
  pos: string;
  gloss: string;
}

// Character / proper names: surface -> reading
const NAMES: Record<string, string> = {
  フェルン: 'ふぇるん', ヒンメル: 'ひんめる', フリーレン: 'ふりーれん', シュタルク: 'しゅたるく',
  壬氏: 'じんし', 猫猫: 'まおまお', マルシル: 'まるしる', しまりん: 'しまりん', 野クル: 'のくる',
  虹夏: 'にじか', 後藤: 'ごとう', アーニャ: 'あーにゃ', 千反田: 'ちたんだ', 藤原: 'ふじわら',
  モモ: 'もも', ターボ: 'たーぼ', 軽井沢: 'かるいざわ',
};

// Extra entries needed by the line pools that are not worth glossing in detail.
const EXTRA = `
早く 早い はやく adv quickly
負けない 負ける まけない v won't lose
あ あ あ p (elongation)
分かって 分かる わかって v understand
なんで = なんで adv why
言葉 = ことば n words; language
いつも = いつも adv always
ただ = ただ adv just; merely
分かります 分かる わかります v understand (polite)
生徒 = せいと n student
言えない 言う いえない v can't say
ちち 父 ちち n papa
はは 母 はは n mama
調べよう 調べる しらべよう v let's investigate
わけない わけ わけない n no way
あっという間 = あっというま n in an instant
時 = とき n time; when
知ろう 知る しろう v try to know
しなかった する しなかった v didn't do
あげたかった あげる あげたかった v wanted to give
騙す = だます v to deceive
開ける = あける v to open
寝坊 = ねぼう n oversleeping
回復 = かいふく n recovery
単純 = たんじゅん na simple
趣味 = しゅみ n hobby
試す = ためす v to try
命令 = めいれい n order; command
何者 = なにもの n who (what kind of person)
として = として p as
みます みる みます v try (polite)
ください くださる ください v please
近づかない 近づく ちかづかない v not approach
なければ ない なければ aux if not
言えません 言う いえません v cannot say
話して 話す はなして v talking
やって やる やって v doing
ちゃんと = ちゃんと adv properly
うまい = うまい a tasty
食べられた 食べる たべられた v was eaten
あげ あげる あげ v give (for someone)
じゃ では じゃ p as for
足りない 足りる たりない v not enough
入れて 入れる いれて v put in
カニ = かに n crab
似て 似る にて v resemble
間に合う = まにあう v to be in time
駄目 = だめ na no good
足して 足す たして v add
立てる = たてる v to put up
見える = みえる v to be visible
寒くて 寒い さむくて a cold and
寝られない 寝る ねられない v can't sleep
みよう みる みよう v let's try
見せたかった 見せる みせたかった v wanted to show
野 = の n field
本 = ほん suf (counter)
来ない 来る こない v not come
子 = こ n child
ん な p sentence-final (dialect)
五 = ご n five
遊ぼう 遊ぶ あそぼう v let's play
休み = やすみ n break; holiday
いたい いる いたい v want to stay
宿題 = しゅくだい n homework
終わった 終わる おわった v finished
人前 = ひとまえ n in public
組みたかった 組む くみたかった v wanted to form
食べられない 食べる たべられない v can't eat
落ち着く = おちつく v to calm down
でも = でも p even
弾ければ 弾く ひければ v if one can play
人気者 = にんきもの n popular person
なれる なる なれる v can become
みた みる みた v tried
毎日 = まいにち n every day
六 = ろく n six
ございます ござる ございます v (polite be)
文化祭 = ぶんかさい n school festival
やる = やる v to do
作る = つくる v to make
つく = つく v to tell (a lie)
わくわく = わくわく adv excited
主義 = しゅぎ n principle; -ism
やらなくて やる やらなくて v not do
やらない やる やらない v not do
強い = つよい a strong
大した = たいした adn great; considerable
答え = こたえ n answer
図書室 = としょしつ n library room
はず = はず n should be
三十三 = さんじゅうさん n thirty-three
帰りません 帰る かえりません v won't go home
頭脳戦 = ずのうせん n battle of wits
お可愛い 可愛い おかわいい a cute (sarcastic)
勝ち = かち n victory
完璧 = かんぺき na perfect
赤い = あかい a red
書記 = しょき n secretary
生きて 生きる いきて v living
せい = せい n fault; because of
かも かも かも p maybe
しれない 知れる しれない v (might)
光 = ひかり n light
見えた 見える みえた v was visible
降る = ふる v to fall (rain)
集まる = あつまる v to gather
なんて = なんて p such as; things like
わけ = わけ n reason
でしょ です でしょ aux right?
好き = すき na liked
力 = ちから n power
借りる = かりる v to borrow
解く = とく v to solve; undo
取り返す = とりかえす v to take back
危ない = あぶない a dangerous
速すぎる 速い はやすぎる a too fast
気になって 気になる きになって v curious about
る いる る aux -ing (casual)
忙しくて 忙しい いそがしくて a busy and
デート = でーと n date
誘って 誘う さそって v invite
みたら みる みたら v how about trying
よう よう よう p (casual let's)
くれて くれる くれて v (do for me)
心配 = しんぱい n worry
楽しかった 楽しい たのしかった a was fun
決めた 決める きめた v decided
いう 言う いう v to say
でも = でも p even
空いた 空く すいた v became empty
したら する したら v if (one) does
ろう だろう ろう aux probably
じゃない だ じゃない aux is not
それ = それ pn that
一日 = いちにち n one day
なら = なら p if
いて いる いて v being
つかう 使う つかう v to use
`;

export const LEX = new Map<string, LexEntry>();
for (const raw of `${LEXICON}\n${EXTRA}`.split('\n')) {
  const line = raw.trim();
  if (!line) continue;
  const [surface, head, reading, pos, ...gloss] = line.split(/\s+/);
  if (!surface || !head || !reading || !pos) continue;
  if (LEX.has(surface)) continue;
  LEX.set(surface, {
    headword: head === '=' ? surface : head,
    reading,
    pos,
    gloss: gloss.join(' '),
  });
}

const POS_MAP: Record<string, [PartOfSpeech, string, string]> = {
  n: [PartOfSpeech.noun, '名詞', '一般'],
  pn: [PartOfSpeech.noun, '名詞', '代名詞'],
  name: [PartOfSpeech.noun, '名詞', '固有名詞'],
  v: [PartOfSpeech.verb, '動詞', '自立'],
  a: [PartOfSpeech.i_adjective, '形容詞', '自立'],
  na: [PartOfSpeech.na_adjective, '名詞', '形容動詞語幹'],
  adv: [PartOfSpeech.other, '副詞', '一般'],
  adn: [PartOfSpeech.other, '連体詞', ''],
  int: [PartOfSpeech.other, '感動詞', ''],
  p: [PartOfSpeech.particle, '助詞', ''],
  aux: [PartOfSpeech.bound_auxiliary, '助動詞', ''],
  suf: [PartOfSpeech.noun, '名詞', '接尾'],
  sym: [PartOfSpeech.symbol, '記号', ''],
};

function kataToHira(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export const missing = new Set<string>();

// Stable pseudo frequency rank (lower = more common): short/common words get low ranks.
export function frequencyRankFor(entry: LexEntry, surface: string): number {
  let h = 0;
  for (const ch of entry.headword) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const base = entry.pos === 'pn' || entry.pos === 'int' ? 40 : entry.headword.length <= 2 ? 300 : 2500;
  return base + (h % (entry.headword.length <= 2 ? 3000 : 25000)) + surface.length;
}

export function lookup(surface: string): (LexEntry & { surface: string }) | null {
  if (/^[、。！？…「」（）\s!?.,]+$/.test(surface)) {
    return { surface, headword: surface, reading: surface, pos: 'sym', gloss: '' };
  }
  const name = NAMES[surface];
  if (name) return { surface, headword: surface, reading: name, pos: 'name', gloss: '' };
  const e = LEX.get(surface);
  if (e) return { surface, ...e };
  if (/^[゠-ヿー]+$/.test(surface)) {
    return { surface, headword: surface, reading: kataToHira(surface), pos: 'n', gloss: '' };
  }
  if (/^[぀-ゟー]+$/.test(surface)) {
    missing.add(surface);
    return { surface, headword: surface, reading: surface, pos: 'p', gloss: '' };
  }
  missing.add(surface);
  return null;
}

export function tokenizeLine(segmented: string): { text: string; tokens: MergedToken[] } {
  const parts = segmented.trim().split(/\s+/);
  const tokens: MergedToken[] = [];
  let text = '';
  for (const part of parts) {
    const start = text.length;
    text += part;
    const e = lookup(part);
    if (!e || e.pos === 'sym') continue;
    const [pos, pos1, pos2] = POS_MAP[e.pos] ?? POS_MAP.n!;
    tokens.push({
      surface: part,
      reading: e.reading,
      headword: e.headword,
      headwordReading: e.reading,
      startPos: start,
      endPos: text.length,
      partOfSpeech: pos,
      pos1,
      pos2,
      pos3: '',
      isMerged: false,
      isKnown: false,
      isNPlusOneTarget: false,
      frequencyRank: e.pos === 'p' || e.pos === 'aux' ? undefined : frequencyRankFor(e, part),
    });
  }
  return { text, tokens };
}
