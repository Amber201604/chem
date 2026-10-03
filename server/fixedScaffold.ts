import { inferQuestionKey, nextPhase } from '../src/learning/catalog.ts'
import type { QuestionKey, SupportLevel, TutorOutput, TutorRequest } from '../src/learning/types.ts'

const copy: Record<
  'en' | 'zh' | 'fr',
  Record<QuestionKey, [string, string, string, string]>
> = {
  en: {
    'predict-cell': [
      'Before running the cell, which electrode do you expect to lose mass, and what observation would test that?',
      'Identify oxidation first. The metal that is oxidized becomes aqueous ions, so that electrode should lose mass.',
      'If Zn is oxidized, Zn(s) → Zn²⁺(aq) + 2e⁻. The zinc electrode thins; copper ions plate out on the cathode.',
      'Predict the mass change for a different metal pair on the bench, then check without asking for the answer.',
    ],
    'voltage-zero': [
      'Name the electron path and the ion path. Which one is interrupted in your current setup?',
      'A sustained reading needs both an external metal path and an internal ionic path. A missing bridge or open switch stops charge balance.',
      'In this model, 0.00 V means no sustained operation: incomplete circuit, blocked bridge, oxide layer, or identical half-cells.',
      'Change only one part of the apparatus and predict whether the meter stays at zero. Explain using both pathways.',
    ],
    'meter-negative': [
      'Did the chemistry reverse, or did only the voltmeter’s reference direction change?',
      'Reversing the leads flips the sign convention. The spontaneous electron direction stays the same.',
      'If the cell is operating, a negative reading usually means the red lead is not on the cathode.',
      'Keep the chemistry fixed and reverse the leads again. What must happen to the sign if your explanation is right?',
    ],
    'salt-bridge': [
      'Which ions must move to cancel charge build-up? Could this bridge form a precipitate with the half-cell ions?',
      'Cl⁻ can precipitate Ag⁺ or Pb²⁺ and block the ionic path. Nitrate is usually a spectator here.',
      'KNO₃ keeps K⁺ and NO₃⁻ mobile without forming those insoluble chlorides.',
      'Propose a different bridge for a silver half-cell and justify it with a solubility rule, not a memorized brand name.',
    ],
    'charge-carriers': [
      'Which particles can move through the solution? Which particles carry charge through the wire?',
      'Electrons move in the metal wire. Ions migrate in the solutions and salt bridge. Electrons do not swim through the electrolyte.',
      'At the cathode, a metal ion must gain electrons to become a neutral atom. Those electrons arrived through the wire, not through the solution.',
      'On the particle view, point to one ion and one electron and say which pathway each uses.',
    ],
    'electrode-process': [
      'Which process is oxidation, and which is reduction? Decide that before labeling anode and cathode.',
      'Oxidation is electron loss (anode). Reduction is electron gain (cathode). Position on the bench does not decide the labels.',
      'The half-cell with the more positive E°red is reduced. That electrode is the cathode and gains mass if metal plates out.',
      'For a new metal pair, write both half-reactions first, then assign anode and cathode.',
    ],
    'anode-mass': [
      'At the anode, does the half-reaction make solid metal or aqueous ions? What should that do to mass?',
      'Oxidation sends metal atoms into solution as ions, so the anode loses mass. Reduction can deposit metal, so the cathode gains mass.',
      'Zn(s) → Zn²⁺ + 2e⁻ decreases anode mass; Cu²⁺ + 2e⁻ → Cu(s) increases cathode mass.',
      'If you swapped concentrations only, would mass still change the same way? Explain with Q, not with left versus right.',
    ],
    'half-equation': [
      'Match each symbol in the half-equation to something on the particle view: atom, ion, or electron.',
      'The electrons in the equation travel in the wire. The ions in the equation change at the electrode surface.',
      'Example: Cu²⁺ + 2e⁻ → Cu(s) means a copper ion at the cathode gains two electrons from the wire and becomes a copper atom.',
      'Write the oxidation half-equation for the anode you actually assembled, then point to each species in the animation.',
    ],
    'potential-vs-current': [
      'Is the meter reporting energy transferred per unit charge, or the flow of charge per second?',
      'Potential difference (E) is energy per coulomb. Current is charge per second. A cell can have a potential even when current is tiny.',
      'In this teaching model a fault reads 0.00 V to mean no sustained operation. A real high-impedance meter might still see an open-circuit potential briefly.',
      'Explain why increasing current is not the same claim as increasing Ecell. Use one sentence for each quantity.',
    ],
    electroplating: [
      'When a metal ion reaches the object being plated, what must happen for it to become a neutral atom?',
      'Plating is reduction at the cathode: Mⁿ⁺ + ne⁻ → M(s). The electrons come through the wire attached to that object.',
      'Electrons do not travel through the bath to the object. Ions travel in the bath; electrons arrive through the metal connection.',
      'Explain nickel plating of a spoon using particles, then write the reduction half-equation with no extra hints.',
    ],
    'independent-transfer': [
      'Choose a cell different from the one you just explained. What will you look at first: process, then labels, then meter sign?',
      'Use the same sequence with less support: identify oxidation/reduction, charge pathways, then predict mass and sign.',
      'You are ready for an unaided check. Write a three-part explanation: observation, particles, equation.',
      'Solve this new case without asking for the next hint. Afterward, compare your claim with the meter and particle view.',
    ],
    uncategorized: [
      'Pick one observation on the bench and one particle-scale feature. How could they support the same claim?',
      'Separate what you see (meter, mass, color) from what must be moving (electrons vs ions).',
      'State the oxidation half-reaction, the reduction half-reaction, and which pathway each charge carrier uses.',
      'Now explain a slightly different setup with fewer prompts. If you get stuck, ask a narrower question.',
    ],
  },
  zh: {
    'predict-cell': [
      '实验开始前，你预期哪一支电极质量会减小？用什么观察来检验？',
      '先判断氧化。被氧化的金属变成水合离子，所以该电极质量应减小。',
      '若锌被氧化：Zn(s) → Zn²⁺(aq) + 2e⁻。锌极变薄，铜离子在阴极析出。',
      '换一对金属，先预测质量变化，再自己核对，不要先要答案。',
    ],
    'voltage-zero': [
      '分别说出电子通路和离子通路。当前装置里哪一条被打断了？',
      '持续读数需要外电路金属通路和内电路离子通路同时完整。缺盐桥或开关断开都会停止电荷平衡。',
      '本模型中 0.00 V 表示不能持续工作：电路不完整、盐桥堵塞、氧化层或相同半电池。',
      '只改一个部件，预测电压是否仍为零，并用两条通路解释。',
    ],
    'meter-negative': [
      '是化学反应反向了，还是只改变了电压表的参考方向？',
      '对调表笔只改变符号约定，自发电子方向不变。',
      '电池在工作时若读数为负，通常是红表笔没有接在阴极。',
      '保持化学不变，再对调一次表笔。若你的解释正确，符号应如何变化？',
    ],
    'salt-bridge': [
      '哪些离子必须迁移来抵消电荷积累？这种盐桥会不会与半电池离子沉淀？',
      'Cl⁻ 可能与 Ag⁺ 或 Pb²⁺ 沉淀并堵塞离子通路。这里的硝酸根通常是旁观离子。',
      'KNO₃ 提供可迁移的 K⁺ 和 NO₃⁻，且不易形成这些难溶氯化物。',
      '为含银半电池另选一种盐桥，用溶解性规则说明，不要只记商品名。',
    ],
    'charge-carriers': [
      '溶液里哪些粒子能移动？导线里哪些粒子运送电荷？',
      '电子在金属导线中移动；离子在溶液和盐桥中迁移。电子不会在电解质里“游过去”。',
      '在阴极，金属离子必须得到电子才变成中性原子。这些电子来自导线，不是来自溶液。',
      '打开微观视图，指出一个离子和一个电子，并说明各自走哪条通路。',
    ],
    'electrode-process': [
      '哪个过程是氧化，哪个是还原？先判断过程，再标注阴阳极。',
      '氧化是失电子（阳极），还原是得电子（阴极）。左右位置不能决定标签。',
      'E°red 更正的半电池发生还原，该电极是阴极；若金属析出则质量增加。',
      '换一对金属，先写两个半反应，再指定阳极和阴极。',
    ],
    'anode-mass': [
      '在阳极，半反应生成的是固体金属还是水合离子？质量应如何变化？',
      '氧化使金属原子进入溶液，阳极质量减小；还原可析出金属，阴极质量增加。',
      'Zn(s) → Zn²⁺ + 2e⁻ 使阳极质量减小；Cu²⁺ + 2e⁻ → Cu(s) 使阴极质量增加。',
      '如果只改变浓度，质量变化方向还一样吗？用反应商 Q 解释，不要用左右位置。',
    ],
    'half-equation': [
      '把半方程里的每个符号对应到微观视图中的原子、离子或电子。',
      '方程中的电子走导线；方程中的离子在电极表面发生变化。',
      '例如 Cu²⁺ + 2e⁻ → Cu(s)：阴极处的铜离子从导线得到两个电子，变成铜原子。',
      '写出你实际搭出的阳极氧化半方程，并在动画里指出每一种微粒。',
    ],
    'potential-vs-current': [
      '电压表报告的是单位电荷转移的能量，还是每秒通过的电荷？',
      '电势差 E 是每库仑的能量；电流是每秒的电荷。即使电流很小，电池仍可有电势。',
      '本教学模型用 0.00 V 表示不能持续工作；真实高内阻电表仍可能短暂看到开路电势。',
      '各用一句话说明：增大电流，与增大 Ecell，不是同一个主张。',
    ],
    electroplating: [
      '当金属离子到达被镀物体时，要变成中性原子必须发生什么？',
      '电镀是阴极还原：Mⁿ⁺ + ne⁻ → M(s)。电子通过接到该物体的导线到来。',
      '电子不穿过镀液游到物体上。离子在溶液中迁移，电子经金属连接到达。',
      '用粒子说明勺子镀镍，再独立写出还原半方程。',
    ],
    'independent-transfer': [
      '另选一个与刚才不同的电池。你先看什么：过程、标签，还是电表符号？',
      '用更少提示重复同一顺序：先氧化还原，再电荷通路，再预测质量和符号。',
      '现在做一次无辅助检查：观察、粒子、方程式，三段都要写。',
      '不要再要下一步提示。写完后把主张与电压表和微观视图对照。',
    ],
    uncategorized: [
      '选一个台面上的观察和一个粒子尺度的特征。它们怎样支持同一个主张？',
      '把看到的（读数、质量、颜色）和必须在移动的（电子与离子）分开。',
      '写出氧化半反应、还原半反应，以及每种电荷载体走哪条通路。',
      '用更少提示解释一个稍有不同的装置。卡住时把问题问得更窄。',
    ],
  },
  fr: {
    'predict-cell': [
      'Avant de lancer la pile, quelle électrode devrait perdre de la masse, et quelle observation le testerait ?',
      'Identifiez d’abord l’oxydation. Le métal oxydé devient des ions aqueux, donc cette électrode perd de la masse.',
      'Si Zn s’oxyde : Zn(s) → Zn²⁺(aq) + 2e⁻. L’électrode de zinc mince ; le cuivre se dépose à la cathode.',
      'Prédisez le changement de masse pour une autre paire de métaux, puis vérifiez sans demander la solution.',
    ],
    'voltage-zero': [
      'Nommez la voie des électrons et celle des ions. Laquelle est interrompue ici ?',
      'Une mesure soutenue exige une voie métallique externe et une voie ionique interne. Pont absent ou circuit ouvert arrête l’équilibre de charge.',
      'Ici, 0,00 V signifie aucun fonctionnement soutenu : circuit incomplet, pont bloqué, oxyde ou demi-piles identiques.',
      'Changez un seul élément et prédisez si le voltmètre reste à zéro. Justifiez avec les deux voies.',
    ],
    'meter-negative': [
      'La chimie s’est-elle inversée, ou seulement le sens de référence du voltmètre ?',
      'Inverser les fils inverse la convention de signe. La direction spontanée des électrons reste la même.',
      'Si la pile fonctionne, un signe négatif signifie souvent que le fil rouge n’est pas à la cathode.',
      'Gardez la chimie fixe et inversez encore les fils. Que doit faire le signe si votre explication est juste ?',
    ],
    'salt-bridge': [
      'Quels ions doivent migrer pour annuler l’accumulation de charge ? Ce pont peut-il précipiter ?',
      'Cl⁻ peut précipiter Ag⁺ ou Pb²⁺ et bloquer la voie ionique. Le nitrate est ici un spectateur habituel.',
      'KNO₃ fournit K⁺ et NO₃⁻ mobiles sans ces chlorures insolubles.',
      'Proposez un autre pont pour une demi-pile d’argent et justifiez par une règle de solubilité.',
    ],
    'charge-carriers': [
      'Quelles particules se déplacent dans la solution ? Lesquelles transportent la charge dans le fil ?',
      'Les électrons circulent dans le fil métallique. Les ions migrent dans les solutions et le pont. Les électrons ne nagent pas dans l’électrolyte.',
      'À la cathode, un ion métallique doit gagner des électrons pour devenir un atome neutre. Ces électrons arrivent par le fil.',
      'Dans la vue particulaire, désignez un ion et un électron et dites quelle voie chacun utilise.',
    ],
    'electrode-process': [
      'Quel processus est l’oxydation, lequel est la réduction ? Décidez avant d’étiqueter anode et cathode.',
      'Oxydation = perte d’électrons (anode). Réduction = gain d’électrons (cathode). La gauche ou la droite ne décide pas.',
      'La demi-pile au E°red le plus positif est réduite. C’est la cathode ; elle gagne de la masse si un métal se dépose.',
      'Pour une nouvelle paire, écrivez les deux demi-réactions, puis assignez anode et cathode.',
    ],
    'anode-mass': [
      'À l’anode, forme-t-on un métal solide ou des ions aqueux ? Quel effet sur la masse ?',
      'L’oxydation envoie des atomes en solution : l’anode perd de la masse. La réduction peut déposer un métal : la cathode en gagne.',
      'Zn(s) → Zn²⁺ + 2e⁻ diminue la masse anodique ; Cu²⁺ + 2e⁻ → Cu(s) augmente la masse cathodique.',
      'Si seules les concentrations changent, le sens des masses reste-t-il le même ? Justifiez avec Q.',
    ],
    'half-equation': [
      'Associez chaque symbole de la demi-équation à un atome, un ion ou un électron de l’animation.',
      'Les électrons de l’équation voyagent dans le fil. Les ions changent à la surface de l’électrode.',
      'Exemple : Cu²⁺ + 2e⁻ → Cu(s) : un ion cuivre à la cathode gagne deux électrons du fil et devient un atome.',
      'Écrivez la demi-équation d’oxydation de l’anode réellement montée, puis montrez chaque espèce.',
    ],
    'potential-vs-current': [
      'Le voltmètre indique-t-il l’énergie par unité de charge, ou la charge par seconde ?',
      'La différence de potentiel E est une énergie par coulomb. Le courant est une charge par seconde.',
      'Dans ce modèle, 0,00 V signifie aucun fonctionnement soutenu. Un vrai voltmètre peut brièvement voir un potentiel à circuit ouvert.',
      'Expliquez en une phrase chaque grandeur : augmenter le courant n’est pas la même affirmation qu’augmenter Ecell.',
    ],
    electroplating: [
      'Quand un ion métallique atteint l’objet à plaquer, que doit-il se passer pour donner un atome neutre ?',
      'Le placage est une réduction cathodique : Mⁿ⁺ + ne⁻ → M(s). Les électrons arrivent par le fil.',
      'Les électrons ne traversent pas le bain. Les ions migrent dans la solution ; les électrons arrivent par le métal.',
      'Expliquez le nickelage d’une cuillère avec des particules, puis écrivez la demi-équation sans indice.',
    ],
    'independent-transfer': [
      'Choisissez une pile différente. Que regardez-vous d’abord : processus, étiquettes, ou signe du voltmètre ?',
      'Reprenez la même séquence avec moins d’aide : oxydoréduction, voies de charge, puis masse et signe.',
      'Contrôle sans aide : observation, particules, équation.',
      'Traitez ce nouveau cas sans demander l’indice suivant, puis comparez à la mesure et à la vue particulaire.',
    ],
    uncategorized: [
      'Choisissez une observation du banc et un fait particulaire. Comment soutiennent-ils la même affirmation ?',
      'Séparez ce que vous voyez (mesure, masse, couleur) de ce qui doit se déplacer (électrons contre ions).',
      'Donnez la demi-réaction d’oxydation, celle de réduction, et la voie de chaque porteur de charge.',
      'Expliquez un montage un peu différent avec moins d’indices. Si vous bloquez, posez une question plus étroite.',
    ],
  },
}

function barrierFor(key: QuestionKey, lab: TutorRequest['lab']): TutorOutput['barrier'] {
  if (key === 'charge-carriers' || key === 'electroplating') return 'conceptual-misunderstanding'
  if (key === 'half-equation') return 'representation-gap'
  if (key === 'potential-vs-current') return 'missing-prerequisite'
  if (key === 'electrode-process') return 'unsystematic-problem-solving'
  if (key === 'voltage-zero' && lab.fault !== 'none') return 'conceptual-misunderstanding'
  return 'insufficient-evidence'
}

export function localScaffold(input: TutorRequest, supportLevel: SupportLevel): TutorOutput {
  const questionKey = input.questionKey ?? inferQuestionKey(input.message)
  const lines = copy[input.locale][questionKey]
  const inspectCue = questionKey === 'charge-carriers' || questionKey === 'half-equation' || questionKey === 'electroplating'
  return {
    reply: lines[supportLevel],
    phase: supportLevel >= 3 ? 'independent-check' : nextPhase(input.phase),
    supportLevel,
    questionKey,
    barrier: barrierFor(questionKey, input.lab),
    barrierConfidence: supportLevel === 0 ? 'low' : 'medium',
    evidence: input.message.slice(0, 180),
    whatChanged: supportLevel === 0 ? '' : `Moved to support level ${supportLevel} for ${questionKey}.`,
    remainingDifficulty: supportLevel < 3 ? `Still working on ${questionKey}.` : '',
    nextActivity:
      supportLevel >= 2
        ? 'Ask the student to explain a new metal pair or electroplating case with fewer prompts.'
        : 'Have the student inspect the matching pathway or particle view, then revise.',
    inspectCue: inspectCue && input.lab.view !== 'micro',
    usedModel: 'local-scaffold',
    fallback: true,
  }
}
