// Knowledge Database - Unbiased, Factual Information

export interface KnowledgeArticle {
  id: string
  slug: string
  title: string
  category: string
  summary: string
  content: string
  truthScore: number
  sources: number
  lastVerified: string
  readTime: number
  tags: string[]
  relatedArticles?: string[]
}

export interface KnowledgeCategory {
  id: string
  name: string
  description: string
  articleCount: number
  color: string
  icon: string
}

// Categories
export const categories: KnowledgeCategory[] = [
  { id: 'science', name: 'Science', description: 'Physics, Chemistry, Biology, Astronomy - the natural world explained', articleCount: 342, color: '#60a5fa', icon: 'Atom' },
  { id: 'history', name: 'History', description: 'World events documented as they happened, without bias', articleCount: 289, color: '#f59e0b', icon: 'History' },
  { id: 'philosophy', name: 'Philosophy', description: 'Ideas that shaped human thought across civilizations', articleCount: 156, color: '#a855f7', icon: 'Brain' },
  { id: 'nature', name: 'Nature', description: 'Earth, ecosystems, climate, and environmental science', articleCount: 198, color: '#22c55e', icon: 'TreePine' },
  { id: 'medicine', name: 'Medicine', description: 'Human body, health, diseases, and medical science', articleCount: 267, color: '#ef4444', icon: 'Heart' },
  { id: 'mathematics', name: 'Mathematics', description: 'Numbers, logic, proofs, and mathematical concepts', articleCount: 134, color: '#3b82f6', icon: 'Calculator' },
  { id: 'geography', name: 'Geography', description: 'Countries, cultures, maps, and human geography', articleCount: 223, color: '#14b8a6', icon: 'Globe' },
  { id: 'technology', name: 'Technology', description: 'Inventions, engineering, and technological progress', articleCount: 312, color: '#eab308', icon: 'Lightbulb' },
  { id: 'arts', name: 'Arts', description: 'Art, literature, music, and creative expression', articleCount: 178, color: '#ec4899', icon: 'Palette' },
  { id: 'society', name: 'Society', description: 'Human behavior, social structures, and civilization', articleCount: 201, color: '#8b5cf6', icon: 'Users' },
  { id: 'law', name: 'Law & Ethics', description: 'Justice, rights, morality, and legal systems', articleCount: 145, color: '#f97316', icon: 'Scale' },
  { id: 'biology', name: 'Biology', description: 'Life, evolution, genetics, and living organisms', articleCount: 256, color: '#06b6d4', icon: 'Microscope' },
]

// Sample Articles Database
export const articles: KnowledgeArticle[] = [
  // Science
  {
    id: '1',
    slug: 'theory-of-relativity',
    title: 'The Theory of Relativity',
    category: 'science',
    summary: 'Einstein\'s revolutionary theory that changed our understanding of space, time, and the universe.',
    content: `# The Theory of Relativity

Albert Einstein published his Special Theory of Relativity in 1905 and General Theory of Relativity in 1915. These theories fundamentally changed physics.

## Special Relativity (1905)

The special theory is based on two postulates:

1. **The laws of physics are the same in all inertial reference frames**
2. **The speed of light in vacuum is constant for all observers**

Key consequences include:
- Time dilation: Moving clocks run slower
- Length contraction: Moving objects appear shorter
- Mass-energy equivalence: E = mc²

## General Relativity (1915)

General relativity describes gravity not as a force, but as curvature of spacetime caused by mass and energy.

Key predictions verified by observation:
- Gravitational time dilation (GPS satellites must account for this)
- Bending of light around massive objects (gravitational lensing)
- Existence of black holes
- Gravitational waves (detected 2015)

## Scientific Consensus

Both theories have been extensively tested and verified. GPS systems, particle accelerators, and astronomical observations all confirm Einstein's predictions with extraordinary precision.`,
    truthScore: 100,
    sources: 847,
    lastVerified: '2024-12-15',
    readTime: 8,
    tags: ['physics', 'einstein', 'spacetime', 'gravity'],
    relatedArticles: ['quantum-mechanics', 'black-holes', 'gravitational-waves']
  },
  {
    id: '2',
    slug: 'evolution-natural-selection',
    title: 'Evolution by Natural Selection',
    category: 'biology',
    summary: 'The scientific theory explaining how species change over time through inherited variations.',
    content: `# Evolution by Natural Selection

Evolution is the process by which species change over generations. Natural selection, proposed by Charles Darwin and Alfred Russel Wallace, is the primary mechanism.

## Core Principles

1. **Variation**: Individuals within a species vary in their traits
2. **Inheritance**: Traits are passed from parents to offspring
3. **Selection**: Some variations improve survival and reproduction
4. **Time**: Changes accumulate over many generations

## Evidence for Evolution

Multiple independent lines of evidence support evolution:

### Fossil Record
- Shows progression of life forms over billions of years
- Transitional fossils (e.g., Tiktaalik, Archaeopteryx)
- Consistent ordering in rock layers worldwide

### Comparative Anatomy
- Homologous structures across species
- Vestigial organs (human appendix, whale hip bones)
- Embryological similarities

### Molecular Biology
- DNA similarities correlate with evolutionary relationships
- Shared genetic "mistakes" across related species
- Observed mutations and natural selection in real-time

### Biogeography
- Island species resemble nearby mainland species
- Continental drift explains species distribution

## Scientific Consensus

Evolution is supported by overwhelming evidence from multiple scientific disciplines. It is the unifying theory of biology, essential for understanding medicine, agriculture, and ecology.`,
    truthScore: 99,
    sources: 1243,
    lastVerified: '2024-12-20',
    readTime: 10,
    tags: ['biology', 'darwin', 'genetics', 'species'],
    relatedArticles: ['dna-genetics', 'fossil-record', 'human-evolution']
  },
  {
    id: '3',
    slug: 'scientific-method',
    title: 'The Scientific Method',
    category: 'science',
    summary: 'The systematic approach used to investigate phenomena, acquire knowledge, and correct errors.',
    content: `# The Scientific Method

The scientific method is a systematic approach to understanding the natural world through observation, experimentation, and evidence-based reasoning.

## Steps of the Scientific Method

### 1. Observation
Careful observation of natural phenomena leads to questions about how things work.

### 2. Question
Formulate a specific, testable question based on observations.

### 3. Hypothesis
Propose a tentative explanation that can be tested. A good hypothesis is:
- Testable
- Falsifiable
- Based on existing knowledge

### 4. Experiment
Design and conduct experiments to test the hypothesis:
- Control variables
- Use control groups
- Replicate results
- Record data systematically

### 5. Analysis
Analyze data using statistical methods to determine if results support or refute the hypothesis.

### 6. Conclusion
Draw conclusions based on evidence. Accept, reject, or modify the hypothesis.

### 7. Communication
Share findings through peer-reviewed publication so others can verify and build upon the work.

## Key Principles

- **Empiricism**: Knowledge comes from sensory experience
- **Falsifiability**: Scientific claims must be testable
- **Reproducibility**: Results must be replicable by others
- **Peer Review**: Independent verification of findings
- **Self-Correction**: Science updates with new evidence

## Why It Works

The scientific method minimizes human bias and error through systematic procedures and independent verification. It has produced our most reliable knowledge about the natural world.`,
    truthScore: 100,
    sources: 156,
    lastVerified: '2024-12-18',
    readTime: 7,
    tags: ['methodology', 'research', 'experiments', 'evidence'],
    relatedArticles: ['peer-review', 'logical-fallacies', 'critical-thinking']
  },
  {
    id: '4',
    slug: 'human-rights-declaration',
    title: 'Universal Declaration of Human Rights',
    category: 'law',
    summary: 'The 1948 document establishing fundamental rights to be universally protected for all people.',
    content: `# Universal Declaration of Human Rights

Adopted by the United Nations General Assembly on December 10, 1948, the UDHR established fundamental human rights to be universally protected.

## Historical Context

Following World War II and the Holocaust, the international community sought to prevent future atrocities. The UN Commission on Human Rights, chaired by Eleanor Roosevelt, drafted the Declaration.

## Key Rights Established

### Civil and Political Rights
- Right to life, liberty, and security (Article 3)
- Freedom from slavery and torture (Articles 4-5)
- Equal protection under law (Articles 6-11)
- Freedom of movement (Article 13)
- Right to seek asylum (Article 14)
- Freedom of thought, conscience, religion (Article 18)
- Freedom of opinion and expression (Article 19)

### Economic, Social, and Cultural Rights
- Right to work and fair wages (Articles 23-24)
- Right to rest and leisure (Article 24)
- Right to adequate standard of living (Article 25)
- Right to education (Article 26)
- Right to participate in cultural life (Article 27)

## Legal Status

The UDHR is not a treaty, but a declaration of principles. However, many of its provisions have become customary international law, and it has inspired:
- International Covenant on Civil and Political Rights (1966)
- International Covenant on Economic, Social and Cultural Rights (1966)
- Regional human rights conventions

## Ongoing Relevance

The UDHR remains the foundation of international human rights law and continues to influence national constitutions and legal systems worldwide.`,
    truthScore: 100,
    sources: 89,
    lastVerified: '2024-12-10',
    readTime: 8,
    tags: ['human-rights', 'united-nations', 'law', 'history'],
    relatedArticles: ['un-formation', 'civil-rights-movement', 'international-law']
  },
  {
    id: '5',
    slug: 'quantum-mechanics',
    title: 'Quantum Mechanics',
    category: 'science',
    summary: 'The fundamental theory describing nature at the smallest scales of atoms and subatomic particles.',
    content: `# Quantum Mechanics

Quantum mechanics describes the behavior of matter and energy at atomic and subatomic scales, where classical physics breaks down.

## Historical Development

- 1900: Max Planck introduces energy quanta
- 1905: Einstein explains photoelectric effect
- 1913: Bohr model of the atom
- 1925-1926: Heisenberg and Schrödinger develop quantum mechanics
- 1927: Heisenberg's uncertainty principle

## Key Concepts

### Wave-Particle Duality
Matter and light exhibit both wave-like and particle-like properties. The double-slit experiment demonstrates this for electrons.

### Superposition
Quantum systems can exist in multiple states simultaneously until measured. This is not about our ignorance—the system genuinely has no definite value.

### Uncertainty Principle
Certain pairs of properties (like position and momentum) cannot both be precisely known. This is a fundamental limit, not a measurement problem.

### Quantum Entanglement
Particles can become correlated such that measuring one instantly affects the other, regardless of distance. Einstein called this "spooky action at a distance."

## Applications

- Transistors and semiconductors (all modern electronics)
- Lasers
- MRI machines
- Atomic clocks (GPS timing)
- Quantum computing (emerging)

## Scientific Status

Quantum mechanics is the most precisely tested theory in physics. Its predictions match experiment to 12 decimal places.`,
    truthScore: 100,
    sources: 634,
    lastVerified: '2024-12-12',
    readTime: 9,
    tags: ['physics', 'atoms', 'particles', 'waves'],
    relatedArticles: ['theory-of-relativity', 'particle-physics', 'quantum-computing']
  },
  {
    id: '6',
    slug: 'water-cycle',
    title: 'The Water Cycle',
    category: 'nature',
    summary: 'The continuous movement of water through Earth\'s systems via evaporation, condensation, and precipitation.',
    content: `# The Water Cycle

The water cycle (hydrological cycle) describes the continuous movement of water on, above, and below Earth's surface.

## Main Processes

### Evaporation
- Water transforms from liquid to vapor
- Occurs primarily from oceans (86% of global evaporation)
- Also from lakes, rivers, soil, and plants (transpiration)
- Solar energy drives this process

### Condensation
- Water vapor cools and transforms back to liquid
- Forms clouds when vapor condenses on particles (condensation nuclei)
- Also forms dew, fog, and frost

### Precipitation
- Water falls from clouds as rain, snow, sleet, or hail
- Occurs when water droplets become too heavy to remain suspended
- Global average: ~1 meter per year over oceans

### Collection
- Water collects in oceans, lakes, rivers, and groundwater
- Some infiltrates soil and becomes groundwater
- Groundwater can remain stored for thousands of years

## Key Facts

- Earth's water is finite—the same water cycles continuously
- 97% of Earth's water is in oceans (saltwater)
- Less than 1% is available freshwater
- Average water molecule spends 9 days in atmosphere
- Complete ocean circulation takes ~3,000 years

## Human Impact

Human activities affect the water cycle through:
- Climate change (intensified cycle, more extreme weather)
- Deforestation (reduced transpiration)
- Urbanization (altered runoff patterns)
- Water extraction (depleting aquifers)

## Importance

The water cycle is essential for:
- All life on Earth
- Weather and climate patterns
- Erosion and landscape formation
- Nutrient cycling`,
    truthScore: 100,
    sources: 234,
    lastVerified: '2024-12-14',
    readTime: 6,
    tags: ['water', 'climate', 'environment', 'earth-science'],
    relatedArticles: ['climate-change', 'ocean-currents', 'weather-patterns']
  },
  {
    id: '7',
    slug: 'world-war-two',
    title: 'World War II',
    category: 'history',
    summary: 'The global conflict from 1939-1945 involving most of the world\'s nations in two opposing military alliances.',
    content: `# World War II (1939-1945)

World War II was the deadliest conflict in human history, involving over 30 countries and resulting in 70-85 million deaths.

## Causes

### Long-term Causes
- Treaty of Versailles (1919) imposed harsh terms on Germany
- Great Depression created economic instability
- Rise of fascism in Italy and Nazism in Germany
- Japanese expansionism in Asia
- Failure of appeasement policies

### Immediate Cause
Germany invaded Poland on September 1, 1939, leading Britain and France to declare war.

## Major Powers

**Allies**: United Kingdom, Soviet Union, United States, China, France (Free French), and others

**Axis**: Germany, Italy, Japan, and others

## Key Events

- 1939: Germany invades Poland
- 1940: Fall of France; Battle of Britain
- 1941: Germany invades USSR; Japan attacks Pearl Harbor
- 1942: Battle of Stalingrad; Midway
- 1944: D-Day invasion of Normandy
- 1945: Germany surrenders (May); Atomic bombs on Japan (August); Japan surrenders (September)

## The Holocaust

The Nazi regime systematically murdered 6 million Jews and millions of others (Roma, disabled, political prisoners, POWs) in genocide.

## Consequences

- 70-85 million dead (3% of world population)
- United Nations established
- Beginning of Cold War
- Decolonization accelerated
- Nuclear age began
- European integration began
- Universal Declaration of Human Rights (1948)

## Historical Significance

WWII reshaped global politics, established the United States and Soviet Union as superpowers, and created international institutions designed to prevent future conflicts.`,
    truthScore: 100,
    sources: 892,
    lastVerified: '2024-12-08',
    readTime: 10,
    tags: ['war', '20th-century', 'europe', 'genocide'],
    relatedArticles: ['world-war-one', 'holocaust', 'cold-war', 'united-nations']
  },
  {
    id: '8',
    slug: 'dna-genetics',
    title: 'DNA and Genetics',
    category: 'biology',
    summary: 'The molecular basis of heredity and how genetic information is stored, copied, and expressed.',
    content: `# DNA and Genetics

DNA (deoxyribonucleic acid) is the molecule that carries genetic information in all living organisms.

## Structure of DNA

### Double Helix
- Two strands wound around each other
- Discovered by Watson and Crick (1953)
- Built on work by Rosalind Franklin and others

### Components
- **Sugar-phosphate backbone**: Structural framework
- **Nucleotide bases**: A (adenine), T (thymine), G (guanine), C (cytosine)
- **Base pairing**: A pairs with T; G pairs with C

### The Genetic Code
- Three bases = one codon
- Each codon specifies one amino acid
- 64 possible codons for 20 amino acids
- Code is nearly universal across all life

## How Genes Work

### DNA Replication
DNA copies itself before cell division, ensuring genetic information passes to new cells.

### Transcription
DNA is copied into RNA (messenger RNA) in the cell nucleus.

### Translation
Ribosomes read mRNA and assemble proteins from amino acids.

## Inheritance

- Humans have 46 chromosomes (23 pairs)
- One set from each parent
- Genes are segments of DNA that code for proteins
- Mutations are changes in DNA sequence

## Applications

- Genetic testing and medicine
- Forensic DNA analysis
- Genetic engineering
- Understanding evolution
- Personalized medicine

## Key Discoveries

- 1866: Mendel's laws of inheritance
- 1944: DNA identified as genetic material
- 1953: Structure of DNA discovered
- 2003: Human Genome Project completed`,
    truthScore: 100,
    sources: 567,
    lastVerified: '2024-12-16',
    readTime: 8,
    tags: ['genetics', 'biology', 'heredity', 'molecular-biology'],
    relatedArticles: ['evolution-natural-selection', 'human-genome', 'genetic-engineering']
  },
  {
    id: '9',
    slug: 'climate-change',
    title: 'Climate Change',
    category: 'nature',
    summary: 'Long-term shifts in global temperatures and weather patterns, primarily driven by human activities since the 1800s.',
    content: `# Climate Change

Climate change refers to long-term shifts in temperatures and weather patterns. Since the 1800s, human activities have been the main driver.

## Scientific Basis

### The Greenhouse Effect
- Certain gases trap heat in Earth's atmosphere
- Natural greenhouse effect keeps Earth habitable
- Human emissions enhance this effect

### Key Greenhouse Gases
- Carbon dioxide (CO2): Fossil fuels, deforestation
- Methane (CH4): Agriculture, fossil fuels, waste
- Nitrous oxide (N2O): Agriculture, industry
- Fluorinated gases: Industrial processes

## Evidence

### Observed Changes
- Global average temperature +1.1°C since pre-industrial times
- Sea level rise: ~20 cm since 1900
- Arctic sea ice declining ~13% per decade
- Glacier retreat worldwide
- Ocean acidification increasing

### Attribution
Multiple lines of evidence confirm human causation:
- Isotopic signatures of fossil fuel CO2
- Cooling stratosphere (greenhouse warming signature)
- Pattern matches model predictions
- Natural factors cannot explain observed warming

## Scientific Consensus

97%+ of climate scientists agree that human activities are causing global warming. Every major scientific organization worldwide endorses this conclusion.

## Impacts

- More frequent and intense heat waves
- Changes in precipitation patterns
- Rising sea levels
- Ocean acidification
- Ecosystem disruption
- Species extinction acceleration

## Mitigation

- Transition to renewable energy
- Energy efficiency improvements
- Electrification of transport
- Sustainable land use
- Carbon capture technologies

## International Response

- 2015: Paris Agreement (limit warming to 1.5-2°C)
- 2021: Glasgow Climate Pact
- Ongoing COP (Conference of Parties) negotiations`,
    truthScore: 99,
    sources: 1456,
    lastVerified: '2024-12-19',
    readTime: 10,
    tags: ['climate', 'environment', 'greenhouse-gases', 'global-warming'],
    relatedArticles: ['water-cycle', 'renewable-energy', 'paris-agreement']
  },
  {
    id: '10',
    slug: 'ancient-greece',
    title: 'Ancient Greece',
    category: 'history',
    summary: 'The civilization that flourished from the 8th century BCE to 146 BCE, foundational to Western culture.',
    content: `# Ancient Greece

Ancient Greek civilization flourished from approximately 800 BCE to 146 BCE, laying foundations for Western philosophy, democracy, science, and arts.

## Historical Periods

### Archaic Period (800-480 BCE)
- Development of the polis (city-state)
- Colonization of Mediterranean
- Homer's Iliad and Odyssey composed
- First Olympic Games (776 BCE)

### Classical Period (480-323 BCE)
- Height of Athenian democracy
- Persian Wars (490-479 BCE)
- Peloponnesian War (431-404 BCE)
- Golden Age of Athens
- Alexander the Great's conquests

### Hellenistic Period (323-146 BCE)
- Greek culture spread across former Persian Empire
- Alexandria as center of learning
- Roman conquest ends Greek independence

## Key Contributions

### Philosophy
- Socrates, Plato, Aristotle
- Logic, ethics, metaphysics, epistemology
- Foundations of Western philosophy

### Democracy
- Athens developed direct democracy (~507 BCE)
- Citizens voted on laws and policies
- Limited to free adult male citizens

### Science and Mathematics
- Pythagoras, Euclid, Archimedes
- Geometry, astronomy, medicine
- Hippocrates: father of medicine

### Arts and Literature
- Tragedy and comedy (Sophocles, Aristophanes)
- Architecture (Parthenon)
- Sculpture (idealized human form)
- Historical writing (Herodotus, Thucydides)

## Legacy

Greek ideas profoundly influenced:
- Roman civilization
- Renaissance Europe
- Modern democratic institutions
- Western philosophy and science
- Art and architecture

## Key City-States

- **Athens**: Democracy, philosophy, arts
- **Sparta**: Military society
- **Corinth**: Trade and commerce
- **Thebes**: Military power (4th century BCE)`,
    truthScore: 100,
    sources: 423,
    lastVerified: '2024-12-11',
    readTime: 9,
    tags: ['ancient-history', 'democracy', 'philosophy', 'civilization'],
    relatedArticles: ['roman-empire', 'democracy', 'greek-philosophy']
  },
  // More articles
  {
    id: '11',
    slug: 'black-holes',
    title: 'Black Holes',
    category: 'science',
    summary: 'Regions of spacetime where gravity is so strong that nothing, not even light, can escape once past the event horizon.',
    content: `# Black Holes

Black holes are regions in space where gravity is so intense that nothing can escape, not even light.

## Formation

### Stellar Black Holes
- Form when massive stars (>20 solar masses) die
- Core collapses after fusion stops
- Supernova explosion, leaving black hole behind

### Supermassive Black Holes
- Found at centers of most galaxies
- Millions to billions of solar masses
- Formation mechanism still debated

## Key Features

### Event Horizon
- The "point of no return"
- Boundary beyond which escape is impossible
- Size depends on mass (Schwarzschild radius)

### Singularity
- Center of the black hole
- Where matter is compressed to infinite density
- Current physics breaks down here

### Hawking Radiation
- Theoretical radiation emitted by black holes
- Proposed by Stephen Hawking (1974)
- Causes black holes to slowly evaporate

## Detection

Black holes are detected through:
- Gravitational effects on nearby stars
- X-ray emissions from accretion disks
- Gravitational waves from mergers
- Direct imaging (Event Horizon Telescope, 2019)

## Famous Examples

- Sagittarius A* (center of Milky Way)
- M87* (first directly imaged, 2019)
- Cygnus X-1 (first confirmed black hole)`,
    truthScore: 99,
    sources: 456,
    lastVerified: '2024-12-18',
    readTime: 7,
    tags: ['astrophysics', 'gravity', 'spacetime', 'stars'],
    relatedArticles: ['theory-of-relativity', 'gravitational-waves', 'big-bang']
  },
  {
    id: '12',
    slug: 'photosynthesis',
    title: 'Photosynthesis',
    category: 'biology',
    summary: 'The process by which plants convert light energy into chemical energy, producing oxygen as a byproduct.',
    content: `# Photosynthesis

Photosynthesis is the process by which plants, algae, and some bacteria convert light energy into chemical energy stored in glucose.

## The Basic Equation

6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂

## Where It Occurs

### Chloroplasts
- Organelles found in plant cells
- Contain chlorophyll (green pigment)
- Have internal membrane system (thylakoids)

## Two Main Stages

### Light-Dependent Reactions
- Occur in thylakoid membranes
- Capture light energy
- Split water molecules (releasing O₂)
- Produce ATP and NADPH

### Calvin Cycle (Light-Independent)
- Occurs in the stroma
- Uses ATP and NADPH from light reactions
- Fixes CO₂ into glucose
- Also called "carbon fixation"

## Importance

- Produces oxygen we breathe
- Base of most food chains
- Removes CO₂ from atmosphere
- Powers almost all life on Earth

## Factors Affecting Rate

- Light intensity
- CO₂ concentration
- Temperature
- Water availability`,
    truthScore: 100,
    sources: 234,
    lastVerified: '2024-12-15',
    readTime: 6,
    tags: ['plants', 'energy', 'oxygen', 'carbon-cycle'],
    relatedArticles: ['climate-change', 'ecosystems', 'cellular-respiration']
  },
  {
    id: '13',
    slug: 'renaissance',
    title: 'The Renaissance',
    category: 'history',
    summary: 'A cultural movement from the 14th to 17th century that marked the transition from medieval to modern Europe.',
    content: `# The Renaissance

The Renaissance (meaning "rebirth") was a period of cultural, artistic, and intellectual transformation in Europe from roughly 1350 to 1600.

## Origins

- Began in Italian city-states (Florence, Venice, Rome)
- Revival of interest in classical Greek and Roman culture
- Wealth from trade enabled patronage of arts

## Key Characteristics

### Humanism
- Focus on human potential and achievement
- Study of classical texts
- Education in humanities (literature, history, philosophy)

### Art and Architecture
- Perspective and realism
- Study of human anatomy
- Famous artists: Leonardo, Michelangelo, Raphael
- Classical architectural elements revived

### Science
- Observation and experimentation valued
- Copernicus: heliocentric model
- Galileo: telescope observations
- Foundation for Scientific Revolution

## Spread Across Europe

### Northern Renaissance
- Began ~1500
- Erasmus, Dürer, van Eyck
- More religious themes
- Printing press accelerated spread

## Legacy

- Modern scientific method
- Individual achievement valued
- Secular education systems
- Foundation of Western modernity`,
    truthScore: 100,
    sources: 345,
    lastVerified: '2024-12-10',
    readTime: 7,
    tags: ['europe', 'art', 'culture', 'humanism'],
    relatedArticles: ['ancient-greece', 'scientific-revolution', 'reformation']
  },
  {
    id: '14',
    slug: 'immune-system',
    title: 'The Immune System',
    category: 'medicine',
    summary: 'The complex network of cells, tissues, and organs that defends the body against infections and disease.',
    content: `# The Immune System

The immune system protects the body from pathogens (bacteria, viruses, fungi, parasites) and abnormal cells.

## Two Main Branches

### Innate Immunity
- Present from birth
- Non-specific response
- First line of defense
- Components: skin, mucous membranes, inflammation, fever

### Adaptive Immunity
- Develops through exposure
- Highly specific
- Has memory (basis for vaccines)
- Takes days to weeks to activate

## Key Cells

### White Blood Cells (Leukocytes)
- **B cells**: Produce antibodies
- **T cells**: Kill infected cells, regulate immune response
- **Macrophages**: Engulf pathogens
- **Natural Killer cells**: Destroy virus-infected and cancer cells

## How Vaccines Work

1. Introduce harmless form of pathogen
2. Immune system learns to recognize it
3. Memory cells created
4. Faster, stronger response to real infection

## Immune Disorders

### Autoimmune Diseases
- Immune system attacks own tissues
- Examples: lupus, rheumatoid arthritis, type 1 diabetes

### Immunodeficiency
- Weakened immune response
- Can be inherited or acquired (HIV/AIDS)

### Allergies
- Overreaction to harmless substances
- IgE antibody-mediated`,
    truthScore: 100,
    sources: 512,
    lastVerified: '2024-12-17',
    readTime: 8,
    tags: ['health', 'cells', 'disease', 'vaccines'],
    relatedArticles: ['vaccines', 'infectious-diseases', 'dna-genetics']
  },
  {
    id: '15',
    slug: 'solar-system',
    title: 'The Solar System',
    category: 'science',
    summary: 'Our cosmic neighborhood: the Sun, eight planets, dwarf planets, moons, asteroids, and comets.',
    content: `# The Solar System

The Solar System consists of the Sun and everything gravitationally bound to it, formed about 4.6 billion years ago.

## The Sun

- Contains 99.86% of the system's mass
- A G-type main-sequence star
- Diameter: 1.4 million km
- Core temperature: 15 million °C

## The Planets

### Terrestrial Planets
- **Mercury**: Smallest, closest to Sun, extreme temperatures
- **Venus**: Hottest planet, thick atmosphere, backward rotation
- **Earth**: Only known life, liquid water, one moon
- **Mars**: "Red Planet," thin atmosphere, two moons

### Gas Giants
- **Jupiter**: Largest planet, Great Red Spot, 95 known moons
- **Saturn**: Famous rings, 146 known moons

### Ice Giants
- **Neptune**: Farthest planet, strongest winds
- **Uranus**: Tilted on its side, 27 known moons

## Other Objects

### Dwarf Planets
- Pluto, Eris, Ceres, Haumea, Makemake

### Asteroid Belt
- Between Mars and Jupiter
- Millions of rocky objects

### Kuiper Belt
- Beyond Neptune
- Home of Pluto and many icy bodies

### Oort Cloud
- Hypothetical shell of icy objects
- Source of long-period comets`,
    truthScore: 100,
    sources: 289,
    lastVerified: '2024-12-14',
    readTime: 7,
    tags: ['astronomy', 'planets', 'space', 'sun'],
    relatedArticles: ['black-holes', 'big-bang', 'exoplanets']
  },
  {
    id: '16',
    slug: 'democracy',
    title: 'Democracy',
    category: 'society',
    summary: 'A system of government where power derives from the people, exercised through voting and elected representatives.',
    content: `# Democracy

Democracy is a system of government in which power is vested in the people, who exercise it directly or through elected representatives.

## Origins

- Ancient Athens (5th century BCE)
- Direct democracy: citizens voted on laws
- Limited to free adult males
- Word from Greek: demos (people) + kratos (rule)

## Types

### Direct Democracy
- Citizens vote on policies directly
- Rare in modern states
- Used in referendums, town halls
- Example: Swiss cantons

### Representative Democracy
- Citizens elect representatives
- Most common modern form
- Includes parliamentary and presidential systems

## Key Principles

- **Popular Sovereignty**: Power from the people
- **Political Equality**: One person, one vote
- **Rule of Law**: Laws apply equally to all
- **Protection of Rights**: Individual freedoms protected
- **Free and Fair Elections**: Regular, competitive elections

## Challenges

- Voter turnout and apathy
- Misinformation and propaganda
- Money in politics
- Populism and demagoguery
- Protecting minority rights

## Global Status

- ~45% of countries are democracies
- Democracy has spread since 1970s
- Recent concerns about democratic backsliding
- Ongoing debate about best democratic models`,
    truthScore: 100,
    sources: 267,
    lastVerified: '2024-12-12',
    readTime: 7,
    tags: ['government', 'politics', 'voting', 'freedom'],
    relatedArticles: ['ancient-greece', 'human-rights-declaration', 'constitution']
  },
  {
    id: '17',
    slug: 'artificial-intelligence',
    title: 'Artificial Intelligence',
    category: 'technology',
    summary: 'Computer systems designed to perform tasks that typically require human intelligence.',
    content: `# Artificial Intelligence

Artificial Intelligence (AI) refers to computer systems capable of performing tasks that normally require human intelligence.

## Types of AI

### Narrow AI (Weak AI)
- Designed for specific tasks
- All current AI systems
- Examples: voice assistants, chess programs, image recognition

### General AI (Strong AI)
- Hypothetical human-level intelligence
- Would understand and learn any intellectual task
- Does not yet exist

### Superintelligence
- Theoretical AI surpassing human intelligence
- Topic of philosophical debate

## Key Technologies

### Machine Learning
- Systems learn from data
- Improve without explicit programming
- Subset: Deep Learning (neural networks)

### Natural Language Processing
- Understanding and generating human language
- Powers chatbots, translation, search

### Computer Vision
- Interpreting visual information
- Face recognition, autonomous vehicles

## Applications

- Healthcare: diagnosis, drug discovery
- Transportation: self-driving cars
- Finance: fraud detection, trading
- Entertainment: recommendations, gaming
- Science: protein folding, climate modeling

## Ethical Concerns

- Job displacement
- Bias in algorithms
- Privacy and surveillance
- Autonomous weapons
- Existential risk debates`,
    truthScore: 98,
    sources: 534,
    lastVerified: '2024-12-20',
    readTime: 8,
    tags: ['computers', 'machine-learning', 'automation', 'future'],
    relatedArticles: ['quantum-computing', 'internet', 'robotics']
  },
  {
    id: '18',
    slug: 'plate-tectonics',
    title: 'Plate Tectonics',
    category: 'nature',
    summary: 'The theory explaining how Earth\'s outer shell is divided into plates that move, causing earthquakes and forming mountains.',
    content: `# Plate Tectonics

Plate tectonics is the theory that Earth's outer shell (lithosphere) is divided into several plates that glide over the mantle.

## Earth's Structure

- **Crust**: Thin outer layer (5-70 km)
- **Mantle**: Hot, semi-solid rock (2,900 km thick)
- **Core**: Iron-nickel, outer liquid, inner solid

## Tectonic Plates

- 7 major plates, many minor ones
- Move 1-10 cm per year
- Float on partially molten asthenosphere
- Driven by mantle convection

## Plate Boundaries

### Divergent
- Plates move apart
- New crust formed
- Example: Mid-Atlantic Ridge

### Convergent
- Plates collide
- Subduction or mountain building
- Example: Himalayas, Andes

### Transform
- Plates slide past each other
- Earthquakes common
- Example: San Andreas Fault

## Evidence

- Matching coastlines (Africa/South America)
- Fossil distribution
- Seafloor spreading
- GPS measurements

## Effects

- Earthquakes and tsunamis
- Volcanic activity
- Mountain formation
- Continental drift
- Ocean basin formation`,
    truthScore: 100,
    sources: 312,
    lastVerified: '2024-12-13',
    readTime: 6,
    tags: ['geology', 'earthquakes', 'volcanoes', 'earth'],
    relatedArticles: ['earthquakes', 'volcanoes', 'pangaea']
  },
  {
    id: '19',
    slug: 'french-revolution',
    title: 'The French Revolution',
    category: 'history',
    summary: 'The 1789-1799 period of radical political and social change in France that ended the monarchy.',
    content: `# The French Revolution (1789-1799)

The French Revolution was a period of radical political and social change that fundamentally altered French society and had worldwide influence.

## Causes

- Financial crisis and debt
- Social inequality (Three Estates system)
- Enlightenment ideas
- Food shortages
- Weak leadership of Louis XVI

## Key Events

### 1789
- Storming of the Bastille (July 14)
- Declaration of Rights of Man and Citizen
- Women's March on Versailles

### 1791-1792
- Constitutional monarchy established
- War with Austria and Prussia
- Monarchy abolished, Republic declared

### The Terror (1793-1794)
- Robespierre and Committee of Public Safety
- Mass executions (guillotine)
- 16,000-40,000 killed
- Ended with Robespierre's execution

### 1795-1799
- Directory government
- Military campaigns
- Napoleon's coup (1799)

## Major Figures

- Louis XVI and Marie Antoinette
- Robespierre
- Danton
- Marat
- Napoleon Bonaparte

## Legacy

- End of absolute monarchy in France
- Declaration of Rights of Man
- Nationalism and citizenship concepts
- Inspired revolutions worldwide
- Metric system adopted`,
    truthScore: 100,
    sources: 456,
    lastVerified: '2024-12-09',
    readTime: 9,
    tags: ['revolution', '18th-century', 'france', 'politics'],
    relatedArticles: ['world-war-one', 'democracy', 'napoleon']
  },
  {
    id: '20',
    slug: 'human-brain',
    title: 'The Human Brain',
    category: 'medicine',
    summary: 'The most complex organ in the human body, controlling all bodily functions and enabling thought, memory, and consciousness.',
    content: `# The Human Brain

The human brain contains approximately 86 billion neurons and is the control center for all bodily functions and cognitive processes.

## Structure

### Major Regions
- **Cerebrum**: Largest part, thinking, learning, personality
- **Cerebellum**: Coordination, balance, motor learning
- **Brainstem**: Basic life functions (breathing, heart rate)

### Cerebral Lobes
- **Frontal**: Decision-making, planning, personality
- **Parietal**: Sensory processing, spatial awareness
- **Temporal**: Hearing, memory, language
- **Occipital**: Visual processing

## How It Works

### Neurons
- Brain cells that transmit electrical signals
- Connected by synapses
- Communicate via neurotransmitters

### Plasticity
- Brain can reorganize itself
- New connections form throughout life
- Basis for learning and recovery from injury

## Key Functions

- Consciousness and thought
- Memory (short-term and long-term)
- Emotions and mood
- Movement control
- Sensory processing
- Language and communication

## Brain Health

Risk factors for decline:
- Lack of sleep
- Chronic stress
- Poor diet
- Physical inactivity
- Social isolation

Protective factors:
- Exercise
- Mental stimulation
- Social engagement
- Healthy diet
- Quality sleep`,
    truthScore: 100,
    sources: 678,
    lastVerified: '2024-12-16',
    readTime: 8,
    tags: ['neuroscience', 'anatomy', 'consciousness', 'memory'],
    relatedArticles: ['immune-system', 'psychology', 'sleep']
  },
  // PHILOSOPHY & IDEAS
  {
    id: '21',
    slug: 'stoicism',
    title: 'Stoicism',
    category: 'philosophy',
    summary: 'An ancient philosophy teaching that virtue, reason, and self-control lead to freedom from suffering.',
    content: `# Stoicism

Stoicism is a school of Hellenistic philosophy founded in Athens by Zeno of Citium around 300 BCE. It teaches that virtue and wisdom are the highest goods.

## Core Principles

### The Dichotomy of Control
- Some things are within our control (our thoughts, actions, judgments)
- Some things are outside our control (external events, others' actions)
- Focus only on what you can control
- Accept what you cannot change

### Living According to Nature
- Humans are rational beings
- We should live according to reason
- Accept our place in the natural order
- Understand we are part of a larger whole

### Virtue as the Highest Good
- Four cardinal virtues: wisdom, justice, courage, temperance
- External goods (wealth, health, reputation) are "preferred indifferents"
- Only virtue leads to true happiness (eudaimonia)

## Key Stoic Philosophers

### Zeno of Citium (334-262 BCE)
- Founded Stoicism
- Taught at the Stoa Poikile (Painted Porch)

### Epictetus (50-135 CE)
- Born a slave
- Emphasized the dichotomy of control
- "It's not what happens to you, but how you react"

### Seneca (4 BCE - 65 CE)
- Roman statesman and writer
- Letters on practical philosophy
- On the Shortness of Life

### Marcus Aurelius (121-180 CE)
- Roman Emperor
- Meditations - personal philosophical journal
- "The obstacle is the way"

## Modern Applications

- Cognitive Behavioral Therapy draws from Stoic ideas
- Used by athletes, military, business leaders
- Practical philosophy for daily challenges
- Emphasis on resilience and emotional regulation`,
    truthScore: 98,
    sources: 234,
    lastVerified: '2024-12-18',
    readTime: 8,
    tags: ['philosophy', 'ancient', 'ethics', 'wisdom', 'self-control'],
    relatedArticles: ['ancient-greece', 'existentialism', 'buddhism']
  },
  {
    id: '22',
    slug: 'existentialism',
    title: 'Existentialism',
    category: 'philosophy',
    summary: 'A philosophical movement emphasizing individual existence, freedom, choice, and the search for meaning.',
    content: `# Existentialism

Existentialism is a philosophical movement that emerged in the 19th and 20th centuries, focusing on individual existence, freedom, and choice.

## Core Ideas

### Existence Precedes Essence
- Humans exist first, then define themselves
- No predetermined human nature
- We create our own meaning through choices
- Jean-Paul Sartre's central concept

### Radical Freedom
- Humans are "condemned to be free" (Sartre)
- Every choice defines who we are
- Cannot escape the burden of choice
- Even refusing to choose is a choice

### Authenticity
- Living according to one's own values
- Not conforming to external expectations
- Taking responsibility for one's choices
- Being true to oneself

### Absurdity
- The conflict between seeking meaning and the universe's silence
- Albert Camus: "The Absurd"
- Response: create meaning despite absurdity
- Rebellion against meaninglessness

## Key Existentialist Thinkers

### Soren Kierkegaard (1813-1855)
- "Father of Existentialism"
- Leap of faith
- Anxiety and despair as human conditions

### Friedrich Nietzsche (1844-1900)
- "God is dead" - loss of absolute values
- Will to power
- Ubermensch (Overman)
- Create your own values

### Jean-Paul Sartre (1905-1980)
- Being and Nothingness
- Bad faith (self-deception)
- Radical responsibility

### Albert Camus (1913-1960)
- The Myth of Sisyphus
- The Stranger
- Absurdism

### Simone de Beauvoir (1908-1986)
- Feminist existentialism
- The Second Sex
- Ethics of ambiguity

## Existentialist Themes

- Anxiety and dread (Angst)
- Death and mortality
- Alienation from society
- The Other
- Freedom and responsibility`,
    truthScore: 97,
    sources: 312,
    lastVerified: '2024-12-17',
    readTime: 9,
    tags: ['philosophy', 'meaning', 'freedom', 'authenticity', 'modern'],
    relatedArticles: ['stoicism', 'nihilism', 'consciousness']
  },
  {
    id: '23',
    slug: 'social-contract',
    title: 'The Social Contract',
    category: 'philosophy',
    summary: 'The theory that individuals consent to surrender some freedoms in exchange for social order and protection.',
    content: `# The Social Contract

The social contract is a theory about the legitimacy of political authority and the relationship between individuals and the state.

## Core Concept

The social contract proposes that:
- Individuals agree (explicitly or implicitly) to form society
- They surrender some natural freedoms
- In exchange for protection and social benefits
- The state's authority derives from this consent

## Major Social Contract Theorists

### Thomas Hobbes (1588-1679)

**State of Nature**: "War of all against all"
- Life is "solitary, poor, nasty, brutish, and short"
- No morality without society
- Constant fear and danger

**Solution**: Absolute sovereign
- People surrender all rights to a ruler
- Sovereign maintains order
- Any government better than none

### John Locke (1632-1704)

**State of Nature**: Relatively peaceful
- Natural rights: life, liberty, property
- Natural law based on reason
- Some inconveniences without government

**Solution**: Limited government
- Consent of the governed
- Right to revolution if government violates rights
- Protection of property central
- Influenced American Revolution

### Jean-Jacques Rousseau (1712-1778)

**State of Nature**: Noble savage
- Humans naturally good
- Society corrupts
- "Man is born free, but everywhere in chains"

**Solution**: General will
- Direct democracy
- Common good over individual interest
- Civil religion
- Influenced French Revolution

## Modern Relevance

### John Rawls (1921-2002)
- "Veil of ignorance" thought experiment
- Justice as fairness
- What principles would rational people choose?

### Contemporary Applications
- Basis of democratic legitimacy
- Human rights theory
- Constitutional governance
- Political obligation debates`,
    truthScore: 98,
    sources: 267,
    lastVerified: '2024-12-15',
    readTime: 8,
    tags: ['political-philosophy', 'government', 'rights', 'society'],
    relatedArticles: ['democracy', 'human-rights-declaration', 'french-revolution']
  },
  {
    id: '24',
    slug: 'free-will',
    title: 'Free Will',
    category: 'philosophy',
    summary: 'The philosophical debate about whether humans have genuine freedom to make choices.',
    content: `# Free Will

The free will debate asks: Do humans have the power to choose their actions freely, or are our choices determined by prior causes?

## Main Positions

### Libertarianism (Philosophical)
- Free will exists
- Some actions are not determined by prior causes
- Humans are ultimate originators of their choices
- Requires some form of agent causation

### Hard Determinism
- All events are caused by prior events
- Human choices are no exception
- Free will is an illusion
- Moral responsibility is problematic

### Compatibilism (Soft Determinism)
- Determinism and free will can coexist
- "Free" means acting according to one's desires without external constraint
- Most common position among philosophers
- Allows for moral responsibility

### Hard Incompatibilism
- Whether determinism or indeterminism is true
- Either way, free will doesn't exist
- Luck replaces control under indeterminism

## Key Arguments

### For Free Will
- Phenomenology: We experience choosing
- Moral responsibility requires freedom
- Deliberation implies alternatives exist
- Self-determination is meaningful

### Against Free Will
- Neuroscience: Brain decides before conscious awareness
- Libet experiments
- Every event has a cause
- Genetics and environment shape us

## The Science

### Libet's Experiments (1983)
- Brain activity precedes conscious decision by ~300ms
- Controversial interpretation
- Does this disprove free will?

### Modern Neuroscience
- Decisions predicted from brain scans
- But prediction is not perfect
- Role of consciousness debated

## Implications

- Criminal justice and punishment
- Praise and blame
- Personal responsibility
- Meaning and purpose
- How we treat others`,
    truthScore: 95,
    sources: 345,
    lastVerified: '2024-12-16',
    readTime: 9,
    tags: ['philosophy', 'consciousness', 'determinism', 'ethics'],
    relatedArticles: ['consciousness', 'human-brain', 'ethics']
  },
  {
    id: '25',
    slug: 'consciousness',
    title: 'Consciousness',
    category: 'philosophy',
    summary: 'The mystery of subjective experience - what it is like to be a conscious being.',
    content: `# Consciousness

Consciousness is perhaps the most profound mystery in science and philosophy: the subjective, first-person experience of being aware.

## The Hard Problem

Philosopher David Chalmers distinguished:

### Easy Problems
- How does the brain process information?
- How do we discriminate stimuli?
- How do we report mental states?
- These are "easy" because they involve mechanisms

### The Hard Problem
- Why is there subjective experience at all?
- Why does information processing feel like something?
- The "explanatory gap" between brain and experience
- May require new fundamental concepts

## Theories of Consciousness

### Dualism
- Mind and matter are separate substances
- Descartes: "I think, therefore I am"
- Problem: How do they interact?

### Physicalism/Materialism
- Consciousness is physical
- Will eventually be explained by neuroscience
- Problem: The hard problem remains

### Functionalism
- Mental states defined by their function
- Mind is like software on brain hardware
- Popular in cognitive science

### Panpsychism
- Consciousness is fundamental to reality
- All matter has some form of experience
- Gaining philosophical attention

### Integrated Information Theory (IIT)
- Consciousness = integrated information (Phi)
- Mathematical measure possible
- Proposed by Giulio Tononi

### Global Workspace Theory
- Consciousness is information broadcast globally in brain
- Proposed by Bernard Baars
- Testable predictions

## Key Questions

### What is Self-Awareness?
- Knowing that you exist
- Mirror test in animals
- Degrees of self-consciousness

### Can Machines Be Conscious?
- Chinese Room argument (Searle)
- Turing Test limitations
- AI and subjective experience

### Animal Consciousness
- Which animals are conscious?
- Cambridge Declaration on Consciousness (2012)
- Ethical implications

## The Mystery

Despite progress in neuroscience, we still cannot explain why physical processes give rise to subjective experience. This remains one of the deepest questions in human inquiry.`,
    truthScore: 94,
    sources: 423,
    lastVerified: '2024-12-19',
    readTime: 10,
    tags: ['philosophy', 'mind', 'neuroscience', 'experience'],
    relatedArticles: ['human-brain', 'free-will', 'artificial-intelligence']
  },
  {
    id: '26',
    slug: 'ethics-morality',
    title: 'Ethics and Morality',
    category: 'philosophy',
    summary: 'The study of right and wrong, good and evil - how should we live and treat others?',
    content: `# Ethics and Morality

Ethics is the branch of philosophy concerned with questions of right and wrong, good and evil, virtue and vice.

## Major Ethical Theories

### Consequentialism
- Actions are right if they produce good outcomes
- The ends can justify the means
- Focus on results, not intentions

**Utilitarianism** (Bentham, Mill)
- Maximize happiness/pleasure for the greatest number
- Calculate costs and benefits
- All beings' interests count equally

### Deontology
- Some actions are inherently right or wrong
- Rules and duties matter, not just outcomes
- Certain things should never be done

**Kant's Ethics**
- Categorical Imperative: Act only on principles you'd want universal
- Treat people as ends, never merely as means
- Respect for rational beings

### Virtue Ethics
- Focus on character, not actions or rules
- What would a virtuous person do?
- Aristotle: Virtues as habits of excellence
- The good life (eudaimonia)

### Care Ethics
- Relationships and context matter
- Developed by feminist philosophers
- Caring as moral foundation
- Particular relationships over abstract principles

## Key Ethical Questions

### Moral Relativism vs. Objectivism
- Are moral truths universal or culturally relative?
- Can we judge other cultures?
- What is the source of moral authority?

### The Trolley Problem
- Would you divert a trolley to save five, killing one?
- Would you push someone to stop it?
- Action vs. inaction
- Reveals moral intuitions

### Applied Ethics
- Medical ethics (euthanasia, abortion, consent)
- Business ethics (corporate responsibility)
- Environmental ethics (duties to nature)
- Animal ethics (animal rights and welfare)

## Metaethics

Questions about ethics itself:
- Are moral statements true or false?
- What do moral terms mean?
- Can we have moral knowledge?
- Why be moral?`,
    truthScore: 97,
    sources: 289,
    lastVerified: '2024-12-14',
    readTime: 9,
    tags: ['philosophy', 'morality', 'virtue', 'justice'],
    relatedArticles: ['stoicism', 'human-rights-declaration', 'democracy']
  },
  {
    id: '27',
    slug: 'capitalism',
    title: 'Capitalism',
    category: 'society',
    summary: 'An economic system based on private ownership, free markets, and profit motive.',
    content: `# Capitalism

Capitalism is an economic system characterized by private ownership of the means of production, free markets, and the pursuit of profit.

## Core Features

### Private Property
- Individuals and corporations own resources
- Property rights protected by law
- Right to buy, sell, and accumulate

### Free Markets
- Prices determined by supply and demand
- Competition between producers
- Consumer choice drives production
- Minimal government intervention (ideally)

### Profit Motive
- Businesses seek to maximize profit
- Incentive for efficiency and innovation
- Risk and reward

### Wage Labor
- Workers sell their labor for wages
- Labor market determines wages
- Capital and labor as factors of production

## Historical Development

### Origins
- Emerged from feudalism (16th-18th centuries)
- Protestant work ethic (Weber)
- Industrial Revolution accelerated growth

### Adam Smith (1723-1790)
- "The Wealth of Nations" (1776)
- "Invisible hand" of the market
- Division of labor
- Father of modern economics

### Variations
- **Laissez-faire**: Minimal government
- **Welfare capitalism**: Social safety nets
- **State capitalism**: Government owns key industries
- **Crony capitalism**: Favoritism and corruption

## Arguments For

- Efficient allocation of resources
- Innovation and technological progress
- Economic growth and wealth creation
- Individual freedom and choice
- Lifted billions from poverty

## Arguments Against

- Inequality and wealth concentration
- Exploitation of workers
- Environmental destruction
- Boom-bust cycles
- Commodification of everything

## Modern Debates

- Role of government regulation
- Universal Basic Income
- Stakeholder vs. shareholder capitalism
- Sustainability and climate change
- Automation and future of work`,
    truthScore: 96,
    sources: 456,
    lastVerified: '2024-12-13',
    readTime: 8,
    tags: ['economics', 'markets', 'society', 'politics'],
    relatedArticles: ['socialism', 'democracy', 'industrial-revolution']
  },
  {
    id: '28',
    slug: 'socialism',
    title: 'Socialism',
    category: 'society',
    summary: 'An economic and political system advocating collective or governmental ownership and democratic control of production.',
    content: `# Socialism

Socialism encompasses various economic and political systems characterized by social ownership of the means of production and democratic control of the economy.

## Core Principles

### Social Ownership
- Means of production owned collectively
- Could be state, worker, or community owned
- Not privately held for profit

### Economic Planning
- Production for use, not profit
- Coordination of economic activity
- Reduce waste and inefficiency

### Equality
- Reduce economic inequality
- Meet basic needs of all
- "From each according to ability, to each according to need"

### Democratic Control
- Workers participate in decisions
- Economic democracy
- Collective decision-making

## Varieties of Socialism

### Democratic Socialism
- Achieve socialism through democratic means
- Strong welfare state
- Mixed economy with social ownership
- Examples: Nordic model elements

### Marxism
- Scientific analysis of capitalism
- Historical materialism
- Class struggle
- Predicted capitalism's collapse

### Market Socialism
- Markets for goods and services
- But social ownership of enterprises
- Worker cooperatives

### Anarcho-Socialism
- Socialism without state
- Decentralized, voluntary cooperation
- Community ownership

## Historical Developments

### Early Socialists
- Robert Owen, Saint-Simon, Fourier
- Utopian socialists
- Experimental communities

### Marx and Engels
- Communist Manifesto (1848)
- Das Kapital
- Revolutionary socialism

### 20th Century
- Russian Revolution (1917)
- Soviet model
- Social democracy in Europe
- Various implementations globally

## Arguments For

- Greater equality
- Basic needs guaranteed
- Democratic economy
- Environmental sustainability
- Workers' dignity

## Arguments Against

- Inefficiency without market signals
- Threats to individual freedom
- Historical failures
- Concentration of power
- Reduced innovation incentives`,
    truthScore: 96,
    sources: 389,
    lastVerified: '2024-12-12',
    readTime: 8,
    tags: ['economics', 'politics', 'equality', 'workers'],
    relatedArticles: ['capitalism', 'democracy', 'french-revolution']
  },
  {
    id: '29',
    slug: 'cognitive-biases',
    title: 'Cognitive Biases',
    category: 'society',
    summary: 'Systematic patterns of deviation from rationality in judgment and decision-making.',
    content: `# Cognitive Biases

Cognitive biases are systematic patterns of deviation from rational judgment. They evolved as mental shortcuts but can lead to errors.

## Why Biases Exist

- Brain processes enormous information quickly
- Heuristics (mental shortcuts) are usually helpful
- But can lead to predictable errors
- Understanding them helps make better decisions

## Common Biases

### Confirmation Bias
- Seeking information that confirms beliefs
- Ignoring contradictory evidence
- Interpreting ambiguous evidence as support
- One of the most pervasive biases

### Anchoring
- Over-relying on first piece of information
- Affects negotiations, estimates
- Initial number influences final judgment
- Hard to adjust sufficiently from anchor

### Availability Heuristic
- Judging probability by how easily examples come to mind
- Recent or vivid events seem more likely
- Explains fear of flying vs. driving
- Media coverage distorts perception

### Dunning-Kruger Effect
- Unskilled people overestimate their ability
- Skilled people underestimate theirs
- Metacognition limitations
- "The more you know, the more you know you don't know"

### Loss Aversion
- Losses feel worse than equivalent gains feel good
- Roughly 2x as painful
- Affects investment decisions
- Status quo bias

### Hindsight Bias
- "I knew it all along" after the fact
- Distorts memory of past predictions
- Makes learning from mistakes harder
- Overconfidence in future predictions

### Sunk Cost Fallacy
- Continuing because of past investment
- "I've already spent so much..."
- Past costs shouldn't affect future decisions
- Rationally, only future costs/benefits matter

### Groupthink
- Desire for conformity in groups
- Suppresses dissent
- Poor group decisions
- Need for devil's advocates

## Debiasing Strategies

- Slow down and think deliberately
- Seek disconfirming evidence
- Consider the opposite
- Use checklists and procedures
- Get outside perspectives
- Pre-commit to decisions
- Understand base rates`,
    truthScore: 99,
    sources: 567,
    lastVerified: '2024-12-18',
    readTime: 8,
    tags: ['psychology', 'thinking', 'rationality', 'decisions'],
    relatedArticles: ['scientific-method', 'human-brain', 'critical-thinking']
  },
  {
    id: '30',
    slug: 'critical-thinking',
    title: 'Critical Thinking',
    category: 'philosophy',
    summary: 'The objective analysis and evaluation of information to form a reasoned judgment.',
    content: `# Critical Thinking

Critical thinking is the disciplined process of actively analyzing, synthesizing, and evaluating information to guide beliefs and actions.

## Core Components

### Analysis
- Breaking down complex information
- Identifying arguments and evidence
- Understanding relationships between ideas
- Recognizing assumptions

### Evaluation
- Assessing the quality of evidence
- Judging the strength of arguments
- Identifying strengths and weaknesses
- Weighing competing claims

### Inference
- Drawing reasonable conclusions
- Connecting evidence to claims
- Recognizing what follows logically
- Avoiding unwarranted leaps

### Self-Regulation
- Monitoring one's own thinking
- Recognizing personal biases
- Adjusting beliefs with new evidence
- Intellectual humility

## Key Skills

### Identifying Arguments
- What is the main claim?
- What reasons support it?
- What evidence is offered?
- What is assumed but not stated?

### Evaluating Evidence
- Is the source reliable?
- Is the evidence relevant?
- Is it sufficient?
- Are there alternative explanations?

### Recognizing Fallacies

**Formal Fallacies** (logical structure)
- Affirming the consequent
- Denying the antecedent

**Informal Fallacies** (content)
- Ad hominem (attacking the person)
- Straw man (misrepresenting argument)
- False dichotomy (either/or)
- Appeal to authority
- Slippery slope
- Circular reasoning
- Red herring

## Habits of Mind

- Intellectual curiosity
- Open-mindedness
- Systematic approach
- Persistence in inquiry
- Confidence in reason
- Fair-mindedness
- Willingness to revise views

## Applications

- Academic research
- Media literacy
- Professional decisions
- Personal choices
- Civic engagement
- Scientific inquiry

## Why It Matters

In an age of information overload and misinformation, critical thinking is essential for:
- Distinguishing fact from fiction
- Making informed decisions
- Participating in democracy
- Solving complex problems`,
    truthScore: 100,
    sources: 234,
    lastVerified: '2024-12-17',
    readTime: 8,
    tags: ['thinking', 'logic', 'rationality', 'education'],
    relatedArticles: ['scientific-method', 'cognitive-biases', 'logical-fallacies']
  },
  {
    id: '31',
    slug: 'big-bang',
    title: 'The Big Bang',
    category: 'science',
    summary: 'The prevailing cosmological model explaining the origin and evolution of the universe from an initial singularity.',
    content: `# The Big Bang

The Big Bang theory describes how the universe expanded from an initial state of extremely high density and temperature about 13.8 billion years ago.

## The Theory

### What It Claims
- The universe began as an extremely hot, dense point
- Space itself has been expanding ever since
- NOT an explosion "into" existing space
- Space, time, matter, and energy all began

### What It Doesn't Claim
- What caused the Big Bang
- What existed "before" (time began with it)
- That there was an explosion in pre-existing space
- That we know everything about the earliest moments

## Evidence

### Cosmic Microwave Background (CMB)
- "Afterglow" of the Big Bang
- Discovered 1965 (Penzias and Wilson)
- Matches predictions precisely
- Maps of early universe structure

### Hubble's Law
- Galaxies moving away from us
- The farther away, the faster they recede
- Universe is expanding
- Discovered 1929

### Abundance of Light Elements
- Hydrogen (~75%) and Helium (~25%)
- Exactly as Big Bang nucleosynthesis predicts
- Couldn't form in stars alone
- Primordial deuterium and lithium

### Large-Scale Structure
- Distribution of galaxies
- Formed from tiny fluctuations in early universe
- CMB variations match galaxy distribution

## Timeline

### Planck Epoch (0 to 10⁻⁴³ seconds)
- All forces unified
- Quantum gravity effects
- Physics not yet understood

### Inflation (10⁻³⁶ to 10⁻³² seconds)
- Exponential expansion
- Universe grew by factor of 10²⁶
- Explains uniformity and flatness

### Quark Epoch (10⁻¹² to 10⁻⁶ seconds)
- Quarks and gluons
- Too hot for hadrons

### Hadron Epoch
- Protons and neutrons form
- Antimatter annihilated

### Nucleosynthesis (3 to 20 minutes)
- Light nuclei form
- Hydrogen, helium, lithium

### Recombination (380,000 years)
- Atoms form
- Universe becomes transparent
- CMB released

### First Stars (~100 million years)
- Population III stars
- Heavy elements created
- Galaxies form

## Open Questions

- What caused the Big Bang?
- What is dark matter?
- What is dark energy?
- Will expansion continue forever?`,
    truthScore: 99,
    sources: 678,
    lastVerified: '2024-12-15',
    readTime: 10,
    tags: ['cosmology', 'universe', 'physics', 'origins'],
    relatedArticles: ['theory-of-relativity', 'black-holes', 'solar-system']
  },
  {
    id: '32',
    slug: 'infinity',
    title: 'Infinity',
    category: 'mathematics',
    summary: 'The concept of something without any limit - a fundamental idea in mathematics with profound philosophical implications.',
    content: `# Infinity

Infinity (∞) represents something without bound or end. It's a concept that has fascinated mathematicians and philosophers for millennia.

## Types of Infinity

### Potential Infinity
- A process that can continue indefinitely
- Never complete, always growing
- Example: counting 1, 2, 3, 4...
- Aristotle's view

### Actual Infinity
- A completed infinite totality
- Exists as a whole
- Example: the set of all natural numbers
- Modern mathematical view

## Cantor's Revolution

Georg Cantor (1845-1918) revolutionized our understanding:

### Countable Infinity (ℵ₀)
- Natural numbers: 1, 2, 3, ...
- Integers: ..., -2, -1, 0, 1, 2, ...
- Rational numbers (surprisingly!)
- Can be listed in sequence

### Uncountable Infinity
- Real numbers cannot be listed
- Cantor's diagonal argument proves this
- Larger than countable infinity
- Infinity comes in different sizes!

### Continuum Hypothesis
- Is there an infinity between ℵ₀ and real numbers?
- Proven undecidable (Gödel and Cohen)
- Can neither prove nor disprove it
- Limits of mathematical knowledge

## Infinity in Mathematics

### Calculus
- Limits approaching infinity
- Infinitesimals
- Infinite series
- Foundation of modern analysis

### Set Theory
- Infinite sets as objects
- Ordinal and cardinal numbers
- Axiom of infinity
- Paradoxes (Russell, Burali-Forti)

### Geometry
- Parallel lines meet "at infinity"
- Projective geometry
- Infinite-dimensional spaces
- Fractals with infinite detail

## Philosophical Issues

### Zeno's Paradoxes
- Achilles and the Tortoise
- Infinite divisibility of space/time
- How can we traverse infinity?
- Resolved by calculus (limits)

### Cosmological Infinity
- Is the universe infinite?
- Infinite time past?
- Infinite multiverse?
- Physical vs. mathematical infinity

### The Infinite Hotel (Hilbert)
- Hotel with infinite rooms, all full
- Can still accommodate more guests
- Illustrates counterintuitive properties
- Infinite - Finite = Infinite`,
    truthScore: 100,
    sources: 189,
    lastVerified: '2024-12-14',
    readTime: 8,
    tags: ['mathematics', 'philosophy', 'concepts', 'paradoxes'],
    relatedArticles: ['big-bang', 'quantum-mechanics', 'logic']
  },
  {
    id: '33',
    slug: 'natural-rights',
    title: 'Natural Rights',
    category: 'law',
    summary: 'Rights that people possess by nature, independent of any government or law - life, liberty, and property.',
    content: `# Natural Rights

Natural rights are rights that are believed to be inherent to all human beings, regardless of laws, customs, or governments.

## Core Concept

### Definition
- Rights we have simply by being human
- Not granted by governments
- Cannot be legitimately taken away
- Universal and inalienable

### vs. Legal Rights
- Legal rights: granted by law, can be revoked
- Natural rights: pre-political, inherent
- Government should protect, not grant
- Basis for judging laws

## Historical Development

### Ancient Roots
- Greek concept of natural law
- Stoic universal reason
- Roman "ius naturale"
- Medieval natural law tradition

### John Locke (1632-1704)
Key natural rights:
- **Life**: Right to self-preservation
- **Liberty**: Freedom from arbitrary control
- **Property**: Right to fruits of one's labor

Government exists to protect these rights. When it fails, revolution is justified.

### Influence on Founding Documents

**Declaration of Independence (1776)**
"We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness."

**French Declaration (1789)**
"Men are born and remain free and equal in rights."

## Philosophical Debates

### Are Rights Really "Natural"?
- Where do they come from?
- Can there be rights without God?
- Are they just social conventions?
- Naturalistic fallacy concerns

### Which Rights Are Natural?
- Life, liberty, property (Locke)
- Pursuit of happiness (Jefferson)
- Economic rights?
- Welfare rights?

### Conflicts Between Rights
- Your liberty vs. my property
- Free speech vs. harm prevention
- How to adjudicate conflicts?

## Modern Relevance

- Foundation of human rights
- Constitutional interpretation
- Limits on government power
- International law basis
- Civil liberties debates`,
    truthScore: 97,
    sources: 234,
    lastVerified: '2024-12-16',
    readTime: 7,
    tags: ['rights', 'philosophy', 'politics', 'freedom'],
    relatedArticles: ['human-rights-declaration', 'social-contract', 'democracy']
  },
  {
    id: '34',
    slug: 'supply-demand',
    title: 'Supply and Demand',
    category: 'society',
    summary: 'The fundamental economic model explaining how prices are determined in markets.',
    content: `# Supply and Demand

Supply and demand is the most fundamental concept in economics, explaining how prices and quantities are determined in markets.

## The Basics

### Demand
- Quantity buyers want at various prices
- Demand curve slopes downward
- Lower price → higher quantity demanded
- Law of Demand

**Factors Shifting Demand:**
- Income changes
- Preferences
- Price of substitutes/complements
- Expectations
- Number of buyers

### Supply
- Quantity sellers offer at various prices
- Supply curve slopes upward
- Higher price → higher quantity supplied
- Law of Supply

**Factors Shifting Supply:**
- Input costs
- Technology
- Number of sellers
- Expectations
- Government policies

## Market Equilibrium

### How It Works
- Where supply meets demand
- Equilibrium price and quantity
- No pressure to change
- "Clears" the market

### Disequilibrium

**Surplus (price too high)**
- Quantity supplied > demanded
- Pressure to lower prices
- Move toward equilibrium

**Shortage (price too low)**
- Quantity demanded > supplied
- Pressure to raise prices
- Move toward equilibrium

## Price Elasticity

### Elasticity of Demand
- How much quantity responds to price changes
- Elastic: large response
- Inelastic: small response
- Affects total revenue

### Factors Affecting Elasticity
- Availability of substitutes
- Necessity vs. luxury
- Time horizon
- Proportion of budget

## Real-World Applications

### Price Controls

**Price Ceilings** (rent control)
- Maximum legal price
- If below equilibrium → shortage
- Unintended consequences

**Price Floors** (minimum wage)
- Minimum legal price
- If above equilibrium → surplus
- Effects debated

### Market Efficiency
- Prices convey information
- Coordinate economic activity
- Allocate resources
- Signal scarcity

## Limitations

- Assumes perfect competition
- Externalities not captured
- Public goods
- Information asymmetries
- Market power`,
    truthScore: 100,
    sources: 345,
    lastVerified: '2024-12-13',
    readTime: 7,
    tags: ['economics', 'markets', 'prices', 'fundamentals'],
    relatedArticles: ['capitalism', 'socialism', 'game-theory']
  },
  {
    id: '35',
    slug: 'buddhism',
    title: 'Buddhism',
    category: 'philosophy',
    summary: 'A path of practice and spiritual development leading to insight into the true nature of reality and liberation from suffering.',
    content: `# Buddhism

Buddhism is a religion and philosophy founded by Siddhartha Gautama (the Buddha) in India around 500 BCE, focused on ending suffering through wisdom and ethical living.

## The Buddha

### Life of Siddhartha Gautama
- Born a prince (~563 BCE)
- Sheltered from suffering
- Encounters old age, sickness, death
- Renounces wealth to seek truth
- Achieves enlightenment under Bodhi tree
- Teaches for 45 years

## Core Teachings

### The Four Noble Truths

1. **Dukkha**: Life involves suffering/unsatisfactoriness
2. **Samudaya**: Suffering arises from craving/attachment
3. **Nirodha**: Suffering can end
4. **Magga**: The Eightfold Path leads to the end of suffering

### The Eightfold Path

**Wisdom**
- Right View
- Right Intention

**Ethics**
- Right Speech
- Right Action
- Right Livelihood

**Meditation**
- Right Effort
- Right Mindfulness
- Right Concentration

### Three Marks of Existence

1. **Anicca**: Impermanence - everything changes
2. **Dukkha**: Unsatisfactoriness - nothing fully satisfies
3. **Anatta**: Non-self - no permanent, unchanging self

### Dependent Origination
- Everything arises dependent on causes and conditions
- Nothing exists independently
- Explains how suffering arises and ceases

## Major Traditions

### Theravada ("Way of the Elders")
- Southeast Asia
- Focus on individual liberation
- Pali Canon scriptures
- Monastic emphasis

### Mahayana ("Great Vehicle")
- East Asia
- Bodhisattva ideal
- Many Buddhas and beings
- Includes Zen, Pure Land

### Vajrayana ("Diamond Vehicle")
- Tibet, Mongolia
- Tantric practices
- Tibetan Buddhism
- Includes Dalai Lama tradition

## Key Concepts

### Karma
- Actions have consequences
- Not fate, but causation
- Shapes future experiences
- Can be changed

### Rebirth
- Continuity without permanent self
- Cycle of birth and death (samsara)
- Liberation (nirvana) ends cycle

### Nirvana
- Extinguishing of craving
- End of suffering
- Not annihilation
- Peace, freedom, awakening`,
    truthScore: 98,
    sources: 456,
    lastVerified: '2024-12-11',
    readTime: 9,
    tags: ['religion', 'philosophy', 'meditation', 'enlightenment'],
    relatedArticles: ['stoicism', 'consciousness', 'ethics-morality']
  },
  {
    id: '36',
    slug: 'logical-fallacies',
    title: 'Logical Fallacies',
    category: 'philosophy',
    summary: 'Common errors in reasoning that undermine the logic of an argument.',
    content: `# Logical Fallacies

Logical fallacies are errors in reasoning that undermine the logic of an argument. Recognizing them is essential for critical thinking.

## Fallacies of Relevance

### Ad Hominem
- Attacking the person, not the argument
- "You can't trust her economics—she's never held a real job"
- Character is irrelevant to argument validity

### Appeal to Authority
- Citing unqualified authority
- Expert in one field speaking on another
- Legitimate expertise is relevant

### Appeal to Emotion
- Using emotion instead of logic
- Fear, pity, flattery
- Emotions can be relevant but not replacements for evidence

### Straw Man
- Misrepresenting someone's argument
- Attacking the distortion
- Easier to defeat the straw man

### Red Herring
- Introducing irrelevant topic
- Distracts from the real issue
- Changes the subject

## Fallacies of Presumption

### Begging the Question (Circular Reasoning)
- Assuming what you're trying to prove
- "The Bible is true because it's God's word, and we know it's God's word because the Bible says so"

### False Dichotomy
- Only two options presented
- When more exist
- "You're either with us or against us"

### Hasty Generalization
- Concluding from too few examples
- Anecdotal evidence
- "I met two rude French people, so French people are rude"

### Slippery Slope
- A leads to Z without justification
- Assuming causal chain
- Each step must be defended

### Post Hoc (False Cause)
- After, therefore because of
- Correlation ≠ causation
- "I wore my lucky socks and we won"

## Fallacies of Ambiguity

### Equivocation
- Using word with different meanings
- "Evolution is just a theory" (scientific vs. everyday meaning)
- Shifting definitions

### Composition
- Part to whole error
- "Each brick is light, so the wall is light"

### Division
- Whole to part error
- "The team is great, so each player is great"

## Other Common Fallacies

### Appeal to Tradition
- "We've always done it this way"
- Tradition doesn't guarantee correctness

### Appeal to Popularity
- "Everyone believes it"
- Popular doesn't mean true

### No True Scotsman
- Redefining term to exclude counterexamples
- "No true Scotsman would..."

### Tu Quoque
- "You do it too"
- Hypocrisy doesn't invalidate argument

## Why Learn Fallacies?

- Improve your own reasoning
- Evaluate others' arguments
- Resist manipulation
- Make better decisions
- Engage in productive debate`,
    truthScore: 100,
    sources: 267,
    lastVerified: '2024-12-18',
    readTime: 9,
    tags: ['logic', 'reasoning', 'arguments', 'critical-thinking'],
    relatedArticles: ['critical-thinking', 'cognitive-biases', 'scientific-method']
  },
  {
    id: '37',
    slug: 'game-theory',
    title: 'Game Theory',
    category: 'mathematics',
    summary: 'The mathematical study of strategic decision-making between rational agents.',
    content: `# Game Theory

Game theory is the study of mathematical models of strategic interaction between rational decision-makers.

## Basic Concepts

### What is a "Game"?
- Players: decision-makers
- Strategies: possible actions
- Payoffs: outcomes for each player
- Rules: structure of interaction

### Types of Games

**By Cooperation**
- Cooperative: binding agreements possible
- Non-cooperative: no binding agreements

**By Information**
- Perfect information: all moves known
- Imperfect information: some hidden

**By Sum**
- Zero-sum: one's gain = other's loss
- Non-zero-sum: mutual benefit possible

## Famous Games

### Prisoner's Dilemma
Two prisoners, each can cooperate or defect:
- Both cooperate: 1 year each
- Both defect: 3 years each
- One defects: 0 years (defector), 5 years (cooperator)

**Nash Equilibrium**: Both defect
**Optimal Outcome**: Both cooperate

Illustrates conflict between individual and collective rationality.

### Chicken (Game of Brinkmanship)
Two drivers head toward each other:
- Both swerve: tie
- One swerves: coward loses
- Neither swerves: crash (worst)

Used to model:
- Nuclear standoffs
- Business competition
- Political negotiations

### Stag Hunt
Coordinate to hunt stag (big payoff) or go alone for rabbit:
- Both hunt stag: best
- One hunts rabbit: they get rabbit, other gets nothing
- Both hunt rabbit: small payoff each

**Trust and coordination problem**

## Key Concepts

### Nash Equilibrium
- No player can improve by changing strategy alone
- Named after John Nash
- May not be optimal
- Multiple equilibria possible

### Dominant Strategy
- Best regardless of what others do
- If exists, should always play it
- Often doesn't exist

### Pareto Efficiency
- No one can be made better off
- Without making someone worse off
- Nash equilibrium may not be Pareto efficient

## Applications

- Economics and business strategy
- Political science and international relations
- Evolutionary biology
- Computer science and AI
- Auction design
- Negotiation and conflict resolution

## Beyond Basic Games

### Repeated Games
- Same game played multiple times
- Cooperation can emerge
- Reputation matters
- Tit-for-tat strategy

### Evolutionary Game Theory
- Strategies as inherited traits
- Natural selection as mechanism
- Evolutionarily stable strategies`,
    truthScore: 99,
    sources: 345,
    lastVerified: '2024-12-15',
    readTime: 9,
    tags: ['mathematics', 'strategy', 'economics', 'decisions'],
    relatedArticles: ['supply-demand', 'artificial-intelligence', 'evolution-natural-selection']
  },
  {
    id: '38',
    slug: 'entropy',
    title: 'Entropy',
    category: 'science',
    summary: 'A measure of disorder, randomness, or uncertainty - fundamental to physics, information theory, and our understanding of time.',
    content: `# Entropy

Entropy is a fundamental concept appearing in thermodynamics, statistical mechanics, and information theory, measuring disorder or uncertainty.

## Thermodynamic Entropy

### Second Law of Thermodynamics
- Total entropy of isolated system never decreases
- Entropy tends to increase
- Explains the arrow of time

### What It Means
- Heat flows from hot to cold (not reverse)
- Ordered states become disordered
- Energy becomes less available for work
- Irreversibility of natural processes

### Examples
- Ice melting in warm room
- Perfume spreading through air
- Shuffled cards won't unshuffle
- You can't unbake a cake

## Statistical Mechanics

### Boltzmann's Insight
- Entropy = measure of possible microscopic arrangements
- S = k ln W (Boltzmann's formula)
- More arrangements = higher entropy
- Connects micro to macro

### Why Entropy Increases
- More disordered states than ordered ones
- Systems naturally evolve toward more probable states
- Not impossible to decrease—just overwhelmingly unlikely

### Maxwell's Demon
- Thought experiment
- Demon sorts fast/slow molecules
- Seems to violate 2nd law
- Resolution: demon must use information, increasing total entropy

## Information Theory

### Shannon Entropy
- Measure of uncertainty/information
- H = -Σ p log p
- Maximum for uniform distribution
- Minimum for certain outcome

### Connection to Thermodynamics
- Information requires physical substrate
- Erasing information increases entropy
- Landauer's principle
- "Information is physical"

## Entropy and Time

### The Arrow of Time
- Why does time have a direction?
- Past → future coincides with entropy increase
- Low-entropy past (Big Bang)
- Explains memory, causation

### Cosmological Implications
- Universe began in low entropy state
- Entropy has been increasing since
- Will continue until heat death?
- Why was initial entropy low?

## Common Misconceptions

### "Everything tends toward disorder"
- Only in isolated systems
- Life creates local order
- Using external energy
- Total entropy still increases

### "Entropy = chaos"
- More precisely: multiplicity of states
- Not just "messiness"
- Precise mathematical definition`,
    truthScore: 99,
    sources: 289,
    lastVerified: '2024-12-14',
    readTime: 8,
    tags: ['physics', 'thermodynamics', 'information', 'time'],
    relatedArticles: ['big-bang', 'theory-of-relativity', 'information-theory']
  },
  {
    id: '39',
    slug: 'printing-press',
    title: 'The Printing Press',
    category: 'technology',
    summary: 'Gutenberg\'s revolutionary invention that democratized knowledge and transformed human civilization.',
    content: `# The Printing Press

Johannes Gutenberg's printing press (c. 1440) is considered one of the most important inventions in human history, enabling the mass production of books.

## Gutenberg's Innovation

### Key Components
- Movable metal type
- Oil-based ink
- Adapted wine/olive press
- Standardized type molds

### What Made It Revolutionary
- Individual letters could be rearranged
- Metal type was durable
- Mass production possible
- Much faster than hand copying

### The Gutenberg Bible (1455)
- First major book printed
- 180 copies produced
- 49 survive today
- Took 3 years to complete

## Before Printing

### Manuscript Culture
- Hand-copied by scribes
- Mostly monks in monasteries
- Expensive and time-consuming
- Limited literacy, limited books

### Earlier Printing
- Chinese woodblock printing (7th century)
- Movable type in China/Korea (11th-13th century)
- But didn't have same impact
- Alphabet vs. thousands of characters

## Impact on Society

### Spread of Knowledge
- Books became affordable
- Literacy rates increased
- Ideas spread rapidly
- Standardized texts

### Protestant Reformation
- Luther's 95 Theses (1517) widely distributed
- Vernacular Bibles
- People could read scripture themselves
- Challenged Church authority

### Scientific Revolution
- Scientists could share findings
- Standardized diagrams and formulas
- Built on each other's work
- Emergence of scientific journals

### Rise of Literacy
- 1500: ~10% European literacy
- 1800: ~50% European literacy
- Education became more accessible
- New reading public emerged

## Cultural Effects

### Standardization
- Spelling and grammar standardized
- National languages emerged
- Dictionaries possible
- Fixed texts vs. fluid manuscripts

### New Ideas
- Spread of Renaissance ideas
- Enlightenment made possible
- Democratic ideas circulated
- Newspapers and public discourse

### Intellectual Property
- Copyright emerged
- Authors as individuals
- Books as commodities
- Publishing industry born

## Comparison to Digital Revolution

- Both democratized information
- Both disrupted existing powers
- Both accelerated change
- Both raised questions about truth/authority
- Internet as "second Gutenberg"`,
    truthScore: 100,
    sources: 234,
    lastVerified: '2024-12-12',
    readTime: 8,
    tags: ['invention', 'history', 'books', 'knowledge'],
    relatedArticles: ['renaissance', 'scientific-revolution', 'internet']
  },
  {
    id: '40',
    slug: 'scientific-revolution',
    title: 'The Scientific Revolution',
    category: 'history',
    summary: 'The emergence of modern science in the 16th-17th centuries, transforming how humans understand the natural world.',
    content: `# The Scientific Revolution

The Scientific Revolution (c. 1543-1687) marked a fundamental transformation in scientific thought, establishing the foundations of modern science.

## Key Developments

### Astronomy

**Copernicus (1473-1543)**
- Heliocentric model
- Earth revolves around Sun
- Published "On the Revolutions" (1543)
- Challenged 1,400 years of geocentrism

**Galileo (1564-1642)**
- Telescope observations
- Moons of Jupiter
- Phases of Venus
- Conflict with Church
- "Father of observational astronomy"

**Kepler (1571-1630)**
- Three laws of planetary motion
- Elliptical orbits
- Mathematical astronomy
- Harmony of the spheres

### Physics

**Newton (1643-1727)**
- Laws of motion
- Universal gravitation
- Calculus
- Optics
- Principia Mathematica (1687)
- "Standing on shoulders of giants"

### Medicine and Biology

**Vesalius (1514-1564)**
- Human anatomy
- Corrected Galen's errors
- Detailed illustrations

**Harvey (1578-1657)**
- Circulation of blood
- Heart as pump
- Experimental method

### Chemistry

**Boyle (1627-1691)**
- Boyle's Law (gases)
- Element concept
- Experimental chemistry
- "Father of modern chemistry"

## New Methods

### Empiricism
- Knowledge from observation
- Experiment over authority
- Francis Bacon's method
- Inductive reasoning

### Mathematics
- Nature written in mathematics (Galileo)
- Quantification
- Mathematical laws
- Predictive power

### Instruments
- Telescope
- Microscope
- Thermometer
- Barometer
- Air pump

## Institutional Changes

### Scientific Societies
- Royal Society (1660)
- French Academy (1666)
- Peer review
- Scientific journals

### Universities
- New subjects
- Experimental teaching
- Less theological focus

## Why It Mattered

### New Worldview
- Mechanical universe
- Natural laws
- Human reason can understand nature
- Progress possible

### Separation from Religion
- Nature as object of study
- Not animate or ensouled
- Gradual secularization
- Conflict with Church authority

### Foundation for Modern World
- Industrial Revolution
- Modern medicine
- Technology
- Scientific method established`,
    truthScore: 100,
    sources: 389,
    lastVerified: '2024-12-13',
    readTime: 9,
    tags: ['history', 'science', 'enlightenment', 'progress'],
    relatedArticles: ['scientific-method', 'renaissance', 'theory-of-relativity']
  },
]

// Search function
export function searchArticles(query: string): KnowledgeArticle[] {
  const lowerQuery = query.toLowerCase()
  return articles.filter(article =>
    article.title.toLowerCase().includes(lowerQuery) ||
    article.summary.toLowerCase().includes(lowerQuery) ||
    article.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    article.content.toLowerCase().includes(lowerQuery)
  )
}

// Get articles by category
export function getArticlesByCategory(categoryId: string): KnowledgeArticle[] {
  return articles.filter(article => article.category === categoryId)
}

// Get article by slug
export function getArticleBySlug(slug: string): KnowledgeArticle | undefined {
  return articles.find(article => article.slug === slug)
}

// Get category by id
export function getCategoryById(id: string): KnowledgeCategory | undefined {
  return categories.find(cat => cat.id === id)
}

// Get related articles
export function getRelatedArticles(article: KnowledgeArticle): KnowledgeArticle[] {
  if (!article.relatedArticles) return []
  return article.relatedArticles
    .map(slug => getArticleBySlug(slug))
    .filter((a): a is KnowledgeArticle => a !== undefined)
}

// Get featured articles (top truth scores, varied categories)
export function getFeaturedArticles(count: number = 6): KnowledgeArticle[] {
  const sorted = [...articles].sort((a, b) => b.truthScore - a.truthScore || b.sources - a.sources)
  // Ensure variety by picking from different categories
  const featured: KnowledgeArticle[] = []
  const usedCategories = new Set<string>()

  for (const article of sorted) {
    if (featured.length >= count) break
    if (!usedCategories.has(article.category) || featured.length >= categories.length) {
      featured.push(article)
      usedCategories.add(article.category)
    }
  }

  return featured
}

// Get random article
export function getRandomArticle(): KnowledgeArticle {
  const randomIndex = Math.floor(Math.random() * articles.length)
  return articles[randomIndex]
}

// Get total article count
export function getTotalArticleCount(): number {
  return articles.length
}

// Get articles count by category
export function getArticleCountByCategory(): { [key: string]: number } {
  const counts: { [key: string]: number } = {}
  for (const article of articles) {
    counts[article.category] = (counts[article.category] || 0) + 1
  }
  return counts
}
