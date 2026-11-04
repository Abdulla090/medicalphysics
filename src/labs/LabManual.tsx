import type { ExperimentId } from './physics';
import type { LabCopy } from './i18n';

const manuals = {
  'simple-pendulum': {
    en: {
      theory: 'A small, dense bob on a light, inextensible string oscillates under gravity. The simulation integrates the full equation θ̈ = −(g/L) sin θ, rather than prescribing a sine wave. In the small-angle limit, T = 2π√(L/g), so the gradient a of T² against L gives g = 4π²/a. At larger angles the period increases; the linearised small-angle analysis then has a systematic bias.',
      equipment: 'Retort stand and clamp, light string, compact bob, metre rule, protractor, and stopwatch. The digital version uses an ideal point mass and automatic timing.',
      steps: ['Choose a length between 0.30 m and 1.50 m. Measure from the suspension point to the centre of the bob, not to its top.', 'Set the release angle to 5–10°. Keep the same angle at every length. Release without pushing.', 'Time 10 or 20 complete oscillations. One oscillation returns to the same position with the same direction of motion. In the simulation, timing starts on release and stops after the selected number of full returns.', 'Repeat three times at the same length, then change length. Collect at least five different lengths over a broad range.', 'For a physical experiment, enter your elapsed times using Bench readings. Compute T = t/N. Average repeated periods at each length, square the mean, and plot T² against L.', 'Fit a straight line with a free intercept. Calculate g = 4π²/gradient. Discuss the intercept, scatter, relative difference from 9.80665 m/s², and limitations of the model.'],
      practice: ['Read the ruler at eye level and include the bob radius when measuring length.', 'Keep the motion in one plane. Secure the stand and use modest amplitudes.', 'Timing several oscillations reduces the fractional effect of reaction time. Begin and finish at a clearly defined phase.', 'Averaging reduces random variation. It does not remove systematic length error, finite-amplitude bias, or timing calibration error.', 'A free intercept can reveal a length offset. With only two lengths, a line can be fitted but its uncertainty cannot be estimated from residuals.'],
      questions: ['Why does changing the bob mass leave the ideal period unchanged?', 'What happens to the estimated g if you measure length to the top of the bob?', 'Why plot T² against L rather than T against L?', 'What changes when the release angle is increased to 30°?', 'How would you include ruler resolution and reaction-time uncertainty in the final result?'],
    },
    ku: {
      theory: 'گۆیەکی بچووک بە دەزوویەکی سووک و نەکشاو لەژێر کاریگەریی کێشکردندا دەلەرێتەوە. سیمیولەیشنەکە هاوکێشەی تەواوی θ̈ = −(g/L) sin θ چارەسەر دەکات. لە گۆشەی بچووکدا T = 2π√(L/g)، بۆیە لاری a لە گرافی T² بەرامبەر L دەداتە g = 4π²/a. لە گۆشەی گەورەدا ماوە زیاد دەبێت و شیکاریی گۆشەی بچووک لادانی سیستەماتیک دروست دەکات.',
      equipment: 'ستاند و گیرە، دەزووی سووک، گۆی چڕ، پێوەری درێژی، گۆشەپێو و کاتژمێر. مۆدێلی دیجیتاڵ بارستایی خاڵی و کاتگرتنی خۆکار بەکار دەهێنێت.',
      steps: ['درێژییەک لەنێوان 0.30 m و 1.50 m هەڵبژێرە. لە خاڵی هەڵواسین بۆ ناوەندی گۆیەکە بپێوە.', 'گۆشەی بەرهەڵدان لەنێوان 5–10° دابنێ و بۆ هەموو درێژییەکان جێگیری بگرە. بێ پاڵنان بەرەڵای بکە.', 'کاتی ١٠ یان ٢٠ لەرینەوەی تەواو بگرە. یەک لەرینەوە گەڕانەوەیە بۆ هەمان شوێن و ئاراستە. لە سیمیولەیشندا کاتگرتن لە بەرهەڵدانەوە دەست پێ دەکات.', 'سێ جار لە هەمان درێژیدا دووبارە بکەرەوە. لانیکەم پێنج درێژیی جیاواز بپێوە.', 'بۆ تاقیکردنەوەی ڕاستەقینە، کاتەکان لە خوێندنەوەی تاقیگە بنووسە. T = t/N هەژمار بکە، تێکڕای ماوەکان بۆ هەر درێژی بدۆزەوە و دووجای بکە.', 'هێڵێک بە بڕگەی ئازاد دابنێ. g = 4π²/لار هەژمار بکە. بڕگە، پەرشبوون و جیاوازی لە 9.80665 m/s² تاوتوێ بکە.'],
      practice: ['پێوەر لە بەرزیی چاو بخوێنەوە و نیوەتیرەی گۆیەکە لە درێژیدا لەبەرچاو بگرە.', 'جووڵە لە یەک ڕوودا بێت. ستاند جێگیر بکە و گۆشەی بچووک بەکاربهێنە.', 'کاتگرتنی چەند لەرینەوەیەک کاریگەریی ڕێژەیی کاتی کاردانەوە کەم دەکاتەوە.', 'تێکڕا هەڵەی هەڕەمەکی کەم دەکاتەوە؛ هەڵەی سیستەماتیکی درێژی و گۆشە لانا‌بات.', 'بڕگەی ئازاد دەتوانێت هەڵەی درێژی پیشان بدات. دوو درێژی بۆ خەمڵاندنی نادڵنیایی بەس نییە.'],
      questions: ['بۆچی بارستایی گۆیەکە ماوەی ئایدیاڵ ناگۆڕێت؟', 'ئەگەر درێژی بۆ سەرەوەی گۆیەکە بپێویت، بەهای g چۆن دەگۆڕێت؟', 'بۆچی T² بەرامبەر L دەکێشین، نەک T؟', 'ئەگەر گۆشەکە بکرێتە 30°، چی دەگۆڕێت؟', 'چۆن وردیی پێوەر و کاتی کاردانەوە لە نادڵنیایی کۆتاییدا لەبەرچاو دەگریت؟'],
    },
    source: 'https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums', sourceLabel: 'OpenStax · University Physics, Vol. 1 · 15.4 Pendulums',
  },
  'hookes-law': {
    en: {
      theory: 'Within the linear elastic range, the magnitude of a spring’s restoring force is F = kx. At static equilibrium the hanging weight balances the spring force, so mg = kx. Plot applied force F against extension x to obtain k from the gradient. Extension is the change from the unloaded length, not the total spring length. This model assumes a massless spring and excludes oscillation and permanent deformation.',
      equipment: 'Clamp stand, spring, mass hanger and slotted masses, and a vertical ruler.',
      steps: ['Measure the unloaded spring length and set a clear zero reference.', 'Select the spring constant for a simulated investigation and keep it fixed throughout the dataset.', 'Increase the hanging mass in small steps. In a physical experiment, wait until all motion has stopped before reading the extension.', 'Record extension in metres and applied force in newtons. Include the hanger in the total suspended mass.', 'Repeat with at least five loads. For a bench experiment, enter your measured x and calculated F = mg.', 'Fit F against x. The gradient gives k in N/m. Compare loading and unloading readings to investigate whether the spring remains elastic.'],
      practice: ['Read the ruler at eye level to avoid parallax.', 'Allow the spring to settle before each measurement.', 'Never exceed the spring’s safe load or elastic limit.', 'Keep the same spring and zero reference across all readings.'],
      questions: ['How would using total length instead of extension change the intercept?', 'What would indicate that the elastic limit has been exceeded?', 'Why must the mass hanger be included in the applied force?'],
    },
    ku: {
      theory: 'لە سنووری کشانی هێڵیدا، قەبارەی هێزی گەڕێنەرەوەی فنەر F = kx ـە. لە هاوسەنگیی جێگیردا mg = kx. گرافی هێزی F بەرامبەر درێژبوونەوەی x لارێک دەدات کە k ـە. درێژبوونەوە بریتییە لە گۆڕانی درێژی، نەک هەموو درێژیی فنەر. ئەم مۆدێلە فنەری بێ بارستایی و بێ لەرینەوە دادەنێت.',
      equipment: 'ستاند و گیرە، فنەر، هەڵگری بار و بارستاییەکان، پێوەری ستوونی.',
      steps: ['درێژیی فنەری بێ بار بپێوە و خاڵی سفر دیاری بکە.', 'نەگۆڕی فنەر بۆ سیمیولەیشن هەڵبژێرە و بۆ هەموو داتاکان جێگیری بگرە.', 'بار هەنگاو بە هەنگاو زیاد بکە. لە تاقیگەی ڕاستەقینە چاوەڕێ بکە تا جووڵە بوەستێت.', 'درێژبوونەوە بە مەتر و هێز بە نیوتن تۆمار بکە. بارستایی هەڵگرەکەش هەژمار بکە.', 'بۆ لانیکەم پێنج بار دووبارە بکەرەوە. لە تاقیگەدا x و F = mg بنووسە.', 'گرافی F بەرامبەر x شیکاری بکە. لار k بە N/m دەدات. بارکردن و لابردنی بار بەراورد بکە.'],
      practice: ['بۆ کەمکردنەوەی پارالاکس لە بەرزیی چاو بخوێنەوە.', 'پێش هەر پێوانەیەک چاوەڕێی وەستانی فنەر بکە.', 'لە باری ڕێگەپێدراو و سنووری کشان تێپەڕ مەبە.', 'هەمان فنەر و خاڵی سفر بەکاربهێنە.'],
      questions: ['بەکارهێنانی درێژیی تەواو لە جیاتی درێژبوونەوە چۆن بڕگە دەگۆڕێت؟', 'چی پیشان دەدات سنووری کشان تێپەڕێنراوە؟', 'بۆچی بارستایی هەڵگرەکەش دەبێت هەژمار بکرێت؟'],
    },
    source: 'https://openstax.org/books/university-physics-volume-1/pages/12-3-stress-strain-and-elastic-modulus', sourceLabel: 'OpenStax · University Physics, Vol. 1 · 12.3 Elasticity',
  },
  'ohms-law': {
    en: {
      theory: 'An ohmic resistor at constant temperature has a proportional voltage–current relationship, V = IR. With V on the vertical axis and I on the horizontal axis, the gradient is resistance R in ohms. The ammeter is placed in series; the voltmeter is connected across the resistor. The simulation uses ideal meters, a DC supply, and a temperature-independent resistor.',
      equipment: 'Low-voltage DC supply, resistor, ammeter, voltmeter, and connecting leads.',
      steps: ['Connect the ammeter in series with the resistor and connect the voltmeter in parallel across it.', 'Choose one resistance and keep it fixed while collecting a dataset.', 'Begin at a low voltage. Increase the supply voltage in steps and record the current at each setting.', 'Record current in amperes and potential difference in volts. Collect at least five settings.', 'For physical measurements, enter I and V in Bench readings. Keep the resistor temperature as constant as possible.', 'Fit V against I. The gradient gives R. Discuss whether a nonzero intercept or curved trend indicates instrument offsets, heating, or non-ohmic behaviour.'],
      practice: ['Use a low-voltage supply and observe the resistor’s rated power P = VI.', 'Disconnect power before changing a physical circuit.', 'Never connect an ammeter directly across a voltage supply.', 'Temperature changes can change resistance; avoid leaving high currents flowing.'],
      questions: ['Why is an ammeter connected in series and a voltmeter in parallel?', 'What does the gradient represent if you plot I against V instead?', 'How could heating change your graph?'],
    },
    ku: {
      theory: 'بەرگرییەکی ئۆهمی لە پلەی گەرمیی جێگیردا پەیوەندیی V = IR هەیە. کاتێک V لە تەوەری ستوونی و I لە تەوەری ئاسۆیی بێت، لار بریتییە لە بەرگریی R بە ئۆهم. ئەمپێرپێو بە زنجیرەیی و ڤۆڵتپێو بە هاوتەریبی لەگەڵ بەرگرییەکە دەبەسترێن. سیمیولەیشن پێوەری ئایدیاڵ و بەرگریی بێ گۆڕانی پلەی گەرمی بەکار دەهێنێت.',
      equipment: 'سەرچاوەی DC بە ڤۆڵتییەی نزم، بەرگری، ئەمپێرپێو، ڤۆڵتپێو و وایەر.',
      steps: ['ئەمپێرپێو بە زنجیرەیی و ڤۆڵتپێو بە هاوتەریبی لەگەڵ بەرگرییەکە ببەستە.', 'بەرگرییەک هەڵبژێرە و لە کۆکردنەوەی داتادا جێگیری بگرە.', 'بە ڤۆڵتییەی نزم دەست پێ بکە. هەنگاو بە هەنگاو زیادی بکە و تەوژم تۆمار بکە.', 'تەوژم بە ئەمپێر و جیاوازیی پۆتانسیەل بە ڤۆڵت تۆمار بکە. لانیکەم پێنج ڕێکخستن بپێوە.', 'بۆ پێوانەی ڕاستەقینە I و V لە خوێندنەوەی تاقیگە بنووسە. پلەی گەرمی تا دەکرێت جێگیر بێت.', 'گرافی V بەرامبەر I شیکاری بکە. لار R دەدات. بڕگەی ناصفر یان ڕەوتی چەماوە تاوتوێ بکە.'],
      practice: ['سەرچاوەی نزم بەکاربهێنە و سنووری توان P = VI ڕەچاو بکە.', 'پێش گۆڕینی بازنەی ڕاستەقینە کارەبا ببڕە.', 'هەرگیز ئەمپێرپێو ڕاستەوخۆ بە دوو کۆتایی سەرچاوە مەبەستە.', 'پلەی گەرمی دەتوانێت بەرگری بگۆڕێت؛ تەوژمی بەرز ماوەی زۆر مەهێڵەوە.'],
      questions: ['بۆچی ئەمپێرپێو بە زنجیرەیی و ڤۆڵتپێو بە هاوتەریبی دەبەسترێن؟', 'ئەگەر I بەرامبەر V بکێشیت، لار چی دەدات؟', 'گەرمبوون چۆن گرافەکەت دەگۆڕێت؟'],
    },
    source: 'https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law', sourceLabel: 'OpenStax · University Physics, Vol. 2 · 9.4 Ohm’s Law',
  },
};

export default function LabManual({ experiment, t, language }: { experiment: ExperimentId; t: LabCopy; language: 'en' | 'ku' }) {
  const entry = manuals[experiment];
  const m = entry[language];
  return <article className="lab-manual"><section><h2>{t.theory}</h2><p>{m.theory}</p><h3>{t.apparatus}</h3><p>{m.equipment}</p><h3>{t.sources}</h3><a href={entry.source} target="_blank" rel="noreferrer">{entry.sourceLabel} ↗</a></section><section><h2>{t.procedure}</h2><ol>{m.steps.map(step => <li key={step}>{step}</li>)}</ol></section><section><h2>{t.goodPractice}</h2><ul>{m.practice.map(line => <li key={line}>{line}</li>)}</ul></section><section><h2>{t.questions}</h2><ol>{m.questions.map(question => <li key={question}>{question}</li>)}</ol></section><p className="lab-manual-disclosure">{t.simulationNote}</p></article>;
}
