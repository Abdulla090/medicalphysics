import type { ExperimentId } from './physics';

export const experiments: { id: ExperimentId; code: string; title: string; titleKu: string; topic: string; topicKu: string; description: string; descriptionKu: string; equation: string; duration: string }[] = [
  { id: 'simple-pendulum', code: 'PHY–101.01', title: 'Simple pendulum', titleKu: 'پەندۆڵی سادە', topic: 'Oscillations & gravity', topicKu: 'لەرینەوە و کێشکردن',
    description: 'Investigate periodic motion. Measure the period, build a T²–L graph, and determine gravitational acceleration.',
    descriptionKu: 'جووڵەی خولی لێکۆڵینەوە بکە. ماوەی لەرینەوە بپێوە، گرافی T²–L دروست بکە و تاودانی کێشکردن بدۆزەوە.', equation: 'T = 2π√(L/g)', duration: '30–45' },
  { id: 'hookes-law', code: 'PHY–101.02', title: 'Hooke’s law', titleKu: 'یاسای هووک', topic: 'Elasticity & forces', topicKu: 'کشان و هێز',
    description: 'Load a spring, measure its extension, and find the spring constant from the force–extension gradient.',
    descriptionKu: 'بار بخەرە سەر فنەر، درێژبوونەوە بپێوە و نەگۆڕی فنەر لە لاری گرافی هێز–درێژبوونەوە بدۆزەوە.', equation: 'F = kx', duration: '20–30' },
  { id: 'ohms-law', code: 'PHY–101.03', title: 'Ohm’s law', titleKu: 'یاسای ئۆهم', topic: 'Electricity & circuits', topicKu: 'کارەبا و بازنەکان',
    description: 'Vary the potential difference across a resistor and determine resistance from the voltage–current relationship.',
    descriptionKu: 'جیاوازی پۆتانسیەل بگۆڕە و بەرگری لە پەیوەندی ڤۆڵتییە–تەوژم بدۆزەوە.', equation: 'V = IR', duration: '20–30' },
];
