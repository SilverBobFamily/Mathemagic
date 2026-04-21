/**
 * Generate AI card art for a release using Gemini 2.5 Flash Image.
 * Saves locally and uploads to Supabase Storage, then updates art_url in DB.
 *
 * Usage:
 *   RELEASE_NUMBER=6 npx tsx scripts/generate-art.ts
 *   (omit RELEASE_NUMBER to run all populated releases)
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

// Service role key bypasses RLS — required for Storage uploads from a script.
// Get it from: Supabase dashboard → Project Settings → API → service_role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Style directives ──────────────────────────────────────────────────────
const R1 = `Neoclassical oil painting in the style of Jacques-Louis David, marble textures, deep cerulean and gold palette, formal symmetrical composition, divine light from above`;
const R2 = `Vintage sepia daguerreotype and woodcut illustration, warm burnt sienna and tan tones, scratched aged texture, dusty frontier landscapes, dramatic silhouettes at sunset`;
const R6 = `Spooky-fun Halloween cartoon in the Goosebumps children's book cover style, muted greens, purples and grays, warm amber accents, bold black outlines, expressive cartoonish characters, no blood or gore, suitable for ages 8+`;

const CLOSE = `Square format, portrait orientation, no text or letters in the image, suitable for a trading card game.`;

const panda = (loc: string, match: string) =>
  `Hidden easter egg: a tiny stuffed panda is ${loc}, rendered in the same ${match} so it blends in. It occupies a very small area of the image. It is NOT a subject — it is a hidden secret that requires careful inspection to find.`;
const bunny = (loc: string, match: string) =>
  `Hidden easter egg: a tiny all-aqua stuffed bunny is ${loc}, rendered in the same ${match} so it blends in. It occupies a very small area of the image. It is NOT a subject — it is a hidden secret that requires careful inspection to find.`;

const R3 = `Victorian natural history illustration with precise Audubon-style linework, earth tones and jungle greens, botanical-scientific composition, white vignette border`;
const R4 = `NASA retro concept art meets 1960s pulp sci-fi illustration, deep navy background, electric cyan and silver, geometric retro spacecraft shapes, cosmic scale`;
const R5 = `Art Deco poster design with 1970s psychedelic album cover aesthetics, bold geometric patterns, vibrant neons on black, musical notation elements, swirling color gradients`;

// ── Prompts keyed by release number → card name ──────────────────────────
const PROMPTS: Record<number, Record<string, string>> = {

  1: {
    'Zeus': `${R1}. Subject: Zeus, king of the gods, a majestic bearded figure enthroned on stormclouds, right arm raised with a crackling lightning bolt, golden divine light radiating from above, flanked by marble columns. ${panda('barely visible tucked behind the base of the rightmost marble column in the deep background', 'pale ivory and shadow tones of the stone')} ${CLOSE}`,

    'Athena': `${R1}. Subject: Athena, goddess of wisdom, a regal helmeted figure in flowing robes standing before a grand marble temple, holding a spear and aegis shield, an owl perched on her arm, olive branch in the background. ${bunny('barely visible nestled in the shadow at the base of the temple steps behind Athena', 'cool marble gray of the stone steps')} ${CLOSE}`,

    'Apollo': `${R1}. Subject: Apollo, god of the sun, a radiant golden-haired young man driving a blazing chariot across the sky, horses rearing, golden light streaming behind him, clouds parting below. ${panda('barely visible as a tiny silhouette perched on a distant cloud bank in the lower right background', 'warm ivory and gold tones of the clouds')} ${CLOSE}`,

    'Poseidon': `${R1}. Subject: Poseidon, lord of the seas, a powerful bearded figure rising from turbulent ocean waves, trident raised high, sea foam and dramatic swells surrounding him, distant cliffs in the background. ${bunny('barely visible perched on a rock at the waterline in the far right background half-obscured by sea foam', 'pale gray-white of the seafoam and wet stone')} ${CLOSE}`,

    'Artemis': `${R1}. Subject: Artemis, goddess of the hunt, a lithe young woman in a silver hunting tunic drawing a crescent moon bow, surrounded by deer in a moonlit forest clearing, silver light filtering through ancient trees. ${panda('barely visible peeking from behind a large tree trunk in the shadowed background', 'dark bark-brown and forest shadow tones')} ${CLOSE}`,

    'Aphrodite': `${R1}. Subject: Aphrodite, goddess of love, an ethereally beautiful woman emerging from sea foam on a golden shell, roses and doves surrounding her, soft golden-pink light, classical drapery flowing in the breeze. ${bunny('barely visible nestled among the rose petals scattered in the lower foreground corner', 'creamy ivory and blush pink of the rose petals')} ${CLOSE}`,

    'Ares': `${R1}. Subject: Ares, god of war, a fierce armored warrior in gleaming bronze breastplate and crimson-plumed helm, sword drawn, burning ruins of a battlefield in the dramatic background, smoke-filled sky. ${panda('barely visible in the distant smoke and ruins in the upper background', 'dark gray smoke and ruin tones of the background')} ${CLOSE}`,

    'Hephaestus': `${R1}. Subject: Hephaestus, divine smith, a stocky muscular figure at a great forge, hammer raised showering sparks in a cavernous volcanic workshop, anvil glowing with heat, bronze and gold tools hanging on the walls. ${bunny('barely visible perched on a stone shelf among the forge tools in the upper background', 'dark bronze and shadow tones of the forge wall')} ${CLOSE}`,

    'Demeter': `${R1}. Subject: Demeter, goddess of harvest, a serene matronly figure in golden robes standing in a vast wheat field at golden hour, sheaves of grain in her arms, rolling farmland extending to the horizon. ${panda('barely visible sitting at the edge of the wheat field in the far background', 'golden-tan and amber of the dried wheat stalks')} ${CLOSE}`,

    'Dionysus': `${R1}. Subject: Dionysus, god of wine, a merry young figure wreathed in grape vines and ivy, holding a golden chalice at a lavish outdoor feast, grapevines heavy with purple clusters, revelers in the background. ${bunny('barely visible tucked behind a large grape cluster in the lower corner of the scene', 'deep purple and shadow tones of the grape clusters')} ${CLOSE}`,

    'Hermes': `${R1}. Subject: Hermes, messenger of the gods, a swift young figure with winged sandals and caduceus staff mid-flight across a blue sky, clouds below, Mount Olympus visible in the golden distance. ${panda('barely visible in a distant cloud formation in the lower background', 'soft ivory and silver of the cloud formations')} ${CLOSE}`,

    'Persephone': `${R1}. Subject: Persephone, queen of the underworld, a dual-natured figure split between spring flowers above and shadowy underworld below, pomegranate in hand, half in golden light and half in blue shadow. ${bunny('barely visible among the spring flowers in the upper portion of the image', 'pale blossom-white and stem-green of the spring blossoms')} ${CLOSE}`,

    'Medusa': `${R1}. Subject: Medusa, the gorgon, a dramatically lit female figure with a crown of writhing stone-grey serpents, her gaze averted from the viewer, stone statues of fallen warriors visible in the shadowy background. ${panda('barely visible in the shadowed background among the stone statues', 'cold stone-gray of the petrified statue background')} ${CLOSE}`,

    'Tantalus': `${R1}. Subject: Tantalus, eternally reaching, a tormented figure standing waist-deep in a pool of water beneath a fruit tree, the branches just beyond his reach, dramatic underworld lighting with distant flames. ${bunny('barely visible as a carved stone relief high on the cave wall in the background', 'dark limestone and shadow tones of the cave wall')} ${CLOSE}`,

    'Ambrosia': `${R1}. Subject: a golden urn filled with glowing ambrosia, the food of the gods, divine radiance spilling from the vessel, set upon a marble altar in a heavenly setting with clouds and columns. ${panda('barely visible carved as a tiny relief into the base of the marble altar', 'pale marble and ivory tones of the altar base')} ${CLOSE}`,

    'Nectar': `${R1}. Subject: a jeweled golden chalice overflowing with luminous divine nectar, droplets catching heavenly light, set upon a celestial banquet table surrounded by offerings in a glowing ethereal setting. ${bunny('barely visible nestled behind the chalice base in the shadow on the banquet table', 'ivory marble tones of the banquet table surface')} ${CLOSE}`,

    'Golden Fleece': `${R1}. Subject: the legendary Golden Fleece displayed on a sacred tree in a moonlit grove, the fleece glowing with divine gold light, a never-sleeping serpent coiled at the base of the tree, ancient forest surrounding. ${panda('barely visible among the gnarled tree roots in the far background', 'dark bark-brown and shadow tones of the forest floor')} ${CLOSE}`,

    "Hermes' Sandals": `${R1}. Subject: a pair of divine winged sandals resting on a marble pedestal, small white feathered wings spread from the ankles, golden straps gleaming, soft divine light, a colonnade visible in the background. ${bunny('barely visible sitting in the shadow behind the marble pedestal', 'cool white and gray marble tones of the pedestal base')} ${CLOSE}`,

    'Lyre of Orpheus': `${R1}. Subject: the enchanted golden lyre of Orpheus displayed in a sunlit marble chamber, golden strings gleaming, flowers and leaves surrounding it as if drawn by the music, birds perched nearby listening. ${panda('barely visible perched among the flowers strewn at the base of the lyre stand', 'pale ivory and soft gold of the scattered flower petals')} ${CLOSE}`,

    "Pandora's Box": `${R1}. Subject: Pandora's ornate gilded box with the lid slightly ajar, dark ethereal wisps escaping from within, Pandora's hand reaching for the lid in a palatial marble chamber, shadows gathering around. ${bunny('barely visible in the shadowed corner of the chamber behind a marble column', 'deep shadow and dark stone tones of the chamber corner')} ${CLOSE}`,

    "Circe's Potion": `${R1}. Subject: Circe the sorceress stirring a glowing cauldron in her enchanted island palace, herbs and strange ingredients strewn about, animals transformed from men watching from the shadows, purple-blue magic light. ${panda('barely visible among the transformed animals in the shadowy background', 'muted gray and shadow tones of the palace floor and background')} ${CLOSE}`,

    'Midas Touch': `${R1}. Subject: King Midas surrounded by everything accidentally turned to solid gold — his throne, fruit, a wine cup — everything glittering, his hands raised in horror and wonder, palatial chamber behind him. ${bunny('barely visible already turned to gold on a shelf in the background, only its shape giving it away', 'gleaming gold tones of all the transformed objects')} ${CLOSE}`,

    'Cyclone of Poseidon': `${R1}. Subject: a massive divine cyclone over the sea summoned by Poseidon, churning dark ocean water into a towering waterspout, ships tossed in the waves below, dramatic storm clouds and lightning above. ${panda('barely visible in the churning sea foam at the base of the waterspout', 'pale gray-white and seafoam tones of the churning water')} ${CLOSE}`,

    'Wrath of Ares': `${R1}. Subject: Ares unleashing divine wrath on a battlefield, armored in blazing crimson, sword sweeping in a wide arc surrounded by divine fire, defeated warriors falling away, smoky dramatic sky. ${bunny('barely visible in the distant battlefield rubble in the background', 'ash-gray and smoke tones of the ruined battlefield background')} ${CLOSE}`,

    'Thunderbolt': `${R1}. Subject: Zeus hurling a divine thunderbolt from the heavens, the massive bolt of white-gold lightning splitting the dark storm sky, Mount Olympus visible above the clouds, overwhelming cosmic scale. ${panda('barely visible in the distant storm cloud bank in the lower background', 'dark storm-gray and charcoal of the thundercloud formation')} ${CLOSE}`,

    'Labyrinth': `${R1}. Subject: the legendary Labyrinth of Crete, a vast maze of towering stone walls extending into the distance, dramatic torchlight casting long shadows through the corridor, a sense of something lurking in the darkness. ${bunny('barely visible perched in a wall niche in the deep background of the corridor', 'pale gray and tan of the ancient stone labyrinth walls')} ${CLOSE}`,

    "Echo's Voice": `${R1}. Subject: the nymph Echo, a translucent ethereal female figure dissolving into sound waves and golden light among mountain cliffs, her form becoming part of the rocky landscape, haunting classical beauty. ${panda('barely visible carved into the cliff face as a worn stone relief in the far background', 'gray-beige and weathered stone tones of the cliff face')} ${CLOSE}`,

    'Curse of Medusa': `${R1}. Subject: Medusa casting her petrifying gaze, dramatic low angle showing her serpent-hair spreading dramatically, the edge of her gaze turning the stone floor to solid marble, lightning cracking the background sky. ${bunny('barely visible already turned to stone in the far background — a tiny frozen silhouette among the other petrified figures', 'cold pale gray of the petrified stone floor and frozen figures')} ${CLOSE}`,

    'Wrath of Hades': `${R1}. Subject: Hades, lord of the underworld, rising dramatically from a fissure in the earth, dark robes billowing, one hand extended in a commanding gesture, the earth crumbling around him, rivers of shadow flowing outward. ${panda('barely visible in the dark rocky fissure in the background', 'deep charcoal and black shadow tones of the underworld rocks')} ${CLOSE}`,

    'Mount Olympus': `${R1}. Subject: Mount Olympus in its full divine glory, the peak rising impossibly high above the clouds, palaces of the gods visible at the summit bathed in golden light, eagles soaring, divine scale. ${bunny('barely visible in the cloud bank near the mountain base in the lower background', 'soft gray-white and mist tones of the cloud formations around the peak')} ${CLOSE}`,
  },

  2: {
    'Sheriff': `${R2}. Subject: a weathered frontier sheriff with a silver star badge, hands near holstered revolvers, standing on the dusty main street of a frontier town at sunset, a jailhouse visible in the background. ${panda('barely visible in the shadow of the jailhouse doorway in the far background', 'dark brown-sepia of the shadowed wooden doorframe')} ${CLOSE}`,

    'Outlaw': `${R2}. Subject: a masked outlaw in a dark duster coat and wide-brimmed hat, wanted posters behind him on a splintered wooden wall, dramatic sunset silhouette, menacing posture, dusty frontier setting. ${bunny('barely visible tucked behind a barrel at the base of the wooden wall in the background', 'worn tan-brown of the weathered wood boards')} ${CLOSE}`,

    'Deputy': `${R2}. Subject: a young frontier deputy with a tin star badge, standing alert outside a sheriff\'s office, rifle at the ready, dusty main street of a Western town behind him at dusk, scratched daguerreotype texture. ${panda('barely visible in the dark window of the sheriff\'s office building in the background', 'dark sepia-brown of the shadowed window frame and glass')} ${CLOSE}`,

    'Saloon Girl': `${R2}. Subject: a Victorian-style saloon performer in an elaborate period dress on a saloon stage, amber lantern light above, the interior of a frontier saloon visible behind, dramatic shadows, woodcut illustration style. ${bunny('barely visible peeking from behind a velvet curtain on the saloon stage in the background', 'warm tan-amber of the dusty curtain fabric')} ${CLOSE}`,

    'Gold Miner': `${R2}. Subject: a bearded frontier prospector knee-deep in a rushing mountain stream, gold pan held aloft catching sunset light, pine trees and mountain ridges in the distance, scratched daguerreotype aesthetic. ${panda('barely visible among the river rocks in the stream in the far background', 'gray-brown of the river stones and wet earth')} ${CLOSE}`,

    'Wrangler': `${R2}. Subject: a frontier cowboy wrangler with a lasso coiled over one shoulder, standing beside a wooden corral fence with horses visible inside, dusty plains and mesa at sunset behind him, woodcut style. ${bunny('barely visible perched on the top rail of the corral fence in the far background', 'warm tan-gray of the weathered fence wood')} ${CLOSE}`,

    'Snake Oil Salesman': `${R2}. Subject: a persuasive frontier medicine salesman beside his painted wagon, holding a bottle of mysterious tonic up to the sunset light, a small crowd of curious silhouettes visible behind, dramatic golden lighting. ${panda('barely visible wedged between bottles and crates on the wagon shelves in the background', 'muted sepia-tan of the dusty wooden wagon shelving')} ${CLOSE}`,

    'Tumbleweed': `${R2}. Subject: a dramatic tumbleweed rolling across a vast empty frontier road at sunset, dust devils visible in the distance, telegraph poles stretching to the horizon, lonely mesa landscape, warm sepia tones. ${bunny('barely visible in the shadow at the base of a telegraph pole in the far background', 'dark sepia-brown of the pole base and cast ground shadow')} ${CLOSE}`,

    'Bandit': `${R2}. Subject: a masked frontier bandit in a bandana and worn duster, lurking in the shadows of a canyon wall, a getaway horse barely visible in the distance, dramatic golden sunset from behind the canyon rim above. ${panda('barely visible in the canyon shadow among the rocks in the lower background', 'dark brown-gray of the shadowed canyon rocks')} ${CLOSE}`,

    'Rustler': `${R2}. Subject: a sneaky cattle rustler in a wide-brimmed hat crouching low in darkness near a cattle pen, longhorns visible behind the fence, dramatic moonlit plains beyond, scratched daguerreotype texture. ${bunny('barely visible nestled in the dry grass at the base of the fence post in the background', 'pale tan-yellow of the dry frontier grass and shadow')} ${CLOSE}`,

    'Bounty Hunter': `${R2}. Subject: a rugged frontier bounty hunter in a leather duster and wide-brimmed hat, riding into a dusty frontier town with a wanted poster on the wall behind, dramatic sunset, chains at the hip. ${panda('barely visible in the dark shadow of an alley between buildings in the background', 'deep brown-sepia of the alley shadow and worn adobe walls')} ${CLOSE}`,

    'Gambler': `${R2}. Subject: a sharp-dressed frontier gambler at a saloon card table, fanned cards in one hand, gold coins on the green felt, amber lamplight above, other silhouetted players visible around the table. ${bunny('barely visible tucked against the saloon baseboard in the background below the table', 'dark sepia-brown of the wooden floor and baseboard shadow')} ${CLOSE}`,

    'Stagecoach Driver': `${R2}. Subject: a frontier stagecoach driver on top of a speeding stagecoach, reins in hand, dramatic sunset behind rocky desert landscape, dust billowing from the wheels, woodcut illustration style. ${panda('barely visible among the luggage strapped to the rear of the stagecoach', 'muted tan-sepia of the canvas luggage covers and leather straps')} ${CLOSE}`,

    'Horse Thief': `${R2}. Subject: a shadowy figure leading a horse away in the dark of night from a frontier stable, amber lantern light barely illuminating the scene, full moon above, tension in the posture, daguerreotype texture. ${bunny('barely visible in the deep shadow at the stable doorway in the background', 'deep dark sepia-brown of the stable door shadow and wall')} ${CLOSE}`,

    'Gold Nugget': `${R2}. Subject: a shining gold nugget resting on a rough wooden assay table, gold scales and tools around it, a prospector\'s lantern casting warm amber light, a mine entrance visible as a dark arch in the background. ${panda('barely visible in the mine entrance shadow in the background', 'dark sepia-gray of the mine tunnel darkness and stone frame')} ${CLOSE}`,

    'Lasso': `${R2}. Subject: a leather lasso perfectly coiled and hanging on a wooden fence post, dramatic dusty plains and orange sunset behind it, the shadow of a cowboy hat cast across the fence, woodcut style. ${bunny('barely visible nestled at the base of the fence post in the ground shadow below the lasso', 'dark brown-sepia of the weathered post base and ground shadow')} ${CLOSE}`,

    'Six-Shooter': `${R2}. Subject: a gleaming frontier revolver resting on a rough wooden table, bullets scattered beside it, an oil lamp casting warm amber light, a wanted poster barely visible on the dark wall behind, daguerreotype texture. ${panda('barely visible in the shadow against the wall behind the revolver', 'dark sepia-brown of the wall boards and shadow')} ${CLOSE}`,

    'Lucky Horseshoe': `${R2}. Subject: a worn iron horseshoe nailed above a frontier cabin doorway, rusty and bent but clearly treasured, amber lantern light illuminating it against weathered wooden planks, dusty frontier porch below. ${bunny('barely visible resting in the dust at the base of the cabin door in the shadow below', 'dark sepia-brown of the dusty porch floor and door shadow')} ${CLOSE}`,

    'Whiskey': `${R2}. Subject: a dusty whiskey bottle and tin cup on a saloon bar, amber liquor catching the lamplight, worn leather-gloved hands around the cup, the dimly lit interior of a frontier saloon visible in the background. ${panda('barely visible behind the whiskey bottles on the back bar shelf in shadow', 'dark sepia of the shadowed shelf and bottles behind')} ${CLOSE}`,

    'Wanted Poster': `${R2}. Subject: a weathered Wanted Poster nailed to a splintered wooden post on a dusty frontier road, the paper torn at the edges, a shadowy outlaw portrait sketched in the center, cacti and a setting sun behind it. ${bunny('barely visible sitting at the base of the wooden post in the shadow below the poster', 'warm sand-tan of the desert floor and base of the post')} ${CLOSE}`,

    'Dynamite': `${R2}. Subject: a bundle of dynamite sticks with a sizzling fuse lying on a dusty mine floor, miners\' tools visible in the background, dramatic shadows cast by lantern light, scratched daguerreotype texture. ${panda('barely visible in the mine tunnel shadow in the background beyond the tools', 'dark sepia-gray of the mine tunnel floor and shadow')} ${CLOSE}`,

    'Railroad Spike': `${R2}. Subject: a large iron railroad spike being driven into a railway tie by a sledgehammer, dramatic golden sunset behind a stretching railway line across the frontier plains, workers silhouetted in the distance. ${bunny('barely visible among the railway ties and gravel in the far background', 'dark gray-brown of the weathered railway gravel and tie shadow')} ${CLOSE}`,

    'Quickdraw': `${R2}. Subject: two frontier gunslingers facing off on a dusty main street at high noon, hands hovering over holsters, the town frozen in suspense on either side, saloons and buildings casting short midday shadows. ${panda('barely visible in the shadow of a saloon porch in the far background', 'dark sepia-brown of the shaded porch and wooden support posts')} ${CLOSE}`,

    'Stampede': `${R2}. Subject: a dramatic longhorn cattle stampede churning up a massive dust cloud across the open plains at sunset, cowboys on horseback trying to turn the herd in the distance, overwhelming scale, woodcut style. ${bunny('barely visible in the dust cloud at the right edge of the image', 'warm tan-sepia of the billowing dust and dry grassland')} ${CLOSE}`,

    'Gold Rush': `${R2}. Subject: a fever-pitched gold rush scene at a mining camp, prospectors swarming a hillside with pans and pickaxes, tents and wooden sluices visible, golden sunset illuminating the activity, daguerreotype texture. ${panda('barely visible near a canvas tent at the edge of the mining camp in the background', 'pale tan-sepia of the canvas tent fabric and dust')} ${CLOSE}`,

    'Desert Heat': `${R2}. Subject: a sun-scorched desert landscape with heat shimmer rising from cracked earth, a bleached cattle skull and cactus visible, a lone rider barely visible in the shimmering distance, oppressive golden-tan palette. ${bunny('barely visible tucked in the shadow of a large rock formation in the right background', 'dark sepia-brown of the shadowed rock face and desert floor')} ${CLOSE}`,

    'Dust Storm': `${R2}. Subject: a massive wall of dust rolling across the frontier plains toward a small ranch house in the distance, silhouettes of cattle and a windmill barely visible through the swirling sepia dust, dramatic scale. ${panda('barely visible in the swirling dust at the edge of the image', 'warm tan-sepia of the billowing dust storm wall')} ${CLOSE}`,

    'Rattlesnake Bite': `${R2}. Subject: a coiled rattlesnake mid-strike on a sun-baked rocky ledge, dramatic close view with desert landscape stretching behind, warning rattle visible, harsh shadows, scratched daguerreotype style. ${bunny('barely visible tucked in the shadow behind a large desert rock in the background', 'dark brown-gray of the rock shadow and sun-baked desert floor')} ${CLOSE}`,

    'Boot Hill': `${R2}. Subject: Boot Hill cemetery on a barren hillside at dusk, simple wooden grave markers stretching across the hill, a lone wooden cross silhouetted against the orange sunset sky, wind-swept dry grass, sepia tones. ${panda('barely visible among the grave markers in the background', 'weathered gray-tan of the wooden grave markers and dry grass')} ${CLOSE}`,

    'Cattle Drive': `${R2}. Subject: a vast cattle drive across open frontier plains at sunset, thousands of longhorns filling the landscape from edge to edge, cowboys on horseback guiding the herd, dust billowing, orange sunset sky, woodcut illustration. ${bunny('barely visible in the shadow of a rocky outcrop beside the trail in the background', 'dark sepia-brown of the rock shadow and dry earth')} ${CLOSE}`,
  },

  3: {
    'T-Rex': `${R3}. Subject: Tyrannosaurus Rex in full profile, mouth open, depicted in the style of a 19th century paleontological plate with careful anatomical detail, lush prehistoric jungle behind it, earth tones and jungle greens. ${panda('barely visible among the dense fern fronds in the lower corner of the vignette border', 'deep jungle green and shadow tones of the fern foliage')} ${CLOSE}`,

    'Brachiosaurus': `${R3}. Subject: Brachiosaurus in elegant full-length profile, long neck reaching into the tree canopy of a prehistoric forest, precise linework, botanical accuracy, earth tones and jungle greens, white vignette border. ${bunny('barely visible nestled in the root system of a large prehistoric tree in the lower background', 'pale gray-brown of the ancient tree bark and root shadow')} ${CLOSE}`,

    'Triceratops': `${R3}. Subject: Triceratops in three-quarter profile showing all three horns and the elaborate frill in fine detail, prehistoric riverbank behind it, Audubon-style scientific linework, earth tones, white vignette border. ${panda('barely visible among rocks at the riverbank in the far background', 'gray-brown of the riverbank stones and shallow water shadow')} ${CLOSE}`,

    'Velociraptor': `${R3}. Subject: Velociraptor in a dynamic hunting stance, feathered body depicted with precise natural history accuracy, prehistoric dense undergrowth behind it, earth tones and jungle green, white vignette border. ${bunny('barely visible in the undergrowth shadows in the background', 'dark jungle green and shadow tones of the dense leaf litter')} ${CLOSE}`,

    'Stegosaurus': `${R3}. Subject: Stegosaurus in full side profile showing the distinctive dorsal plates and spiked tail, grazing in a prehistoric meadow, detailed botanical plants around it, natural history illustration style, white vignette border. ${panda('barely visible among the prehistoric fern plants at the base of the image within the vignette', 'pale gray-green of the young fern fronds at the scene edge')} ${CLOSE}`,

    'Pterodactyl': `${R3}. Subject: Pterodactyl in elegant mid-flight against a pale prehistoric sky, wing membrane depicted in precise anatomical detail, coastal cliffs below, Audubon-style scientific illustration, earth tones, white vignette border. ${bunny('barely visible on a distant cliff ledge in the background', 'pale gray of the limestone cliff face')} ${CLOSE}`,

    'Ankylosaurus': `${R3}. Subject: Ankylosaurus in full profile showing the armored dorsal plates and club tail in fine natural history detail, prehistoric riverbank setting, lush vegetation, earth tones and jungle green, white vignette border. ${panda('barely visible among the fallen leaves and debris on the riverbank in the lower background', 'warm brown and gray of the leaf litter and mud')} ${CLOSE}`,

    'Diplodocus': `${R3}. Subject: Diplodocus in elegant full-length scientific illustration, the long neck and tail shown in careful proportion across a wide prehistoric landscape, Audubon linework style, earth tones, white vignette border. ${bunny('barely visible in the tall prehistoric grass at the edge of the scene near the vignette border', 'pale yellow-green of the dry prehistoric grass')} ${CLOSE}`,

    'Pachycephalosaurus': `${R3}. Subject: Pachycephalosaurus in precise scientific profile showing the distinctive domed skull, prehistoric scrubland behind it, botanical accuracy, Audubon-style natural history illustration, earth tones, white vignette border. ${panda('barely visible partially hidden behind a large prehistoric rock in the background', 'warm gray-brown of the weathered boulder surface')} ${CLOSE}`,

    'Compsognathus': `${R3}. Subject: Compsognathus, a small agile dinosaur, depicted in fine Audubon-style detail mid-stride on a prehistoric forest floor, surrounded by intricate botanical specimens, earth tones and greens, white vignette border. ${bunny('barely visible among the moss-covered rocks in the lower corner within the vignette', 'pale gray-green of the mossy rock surface')} ${CLOSE}`,

    'Parasaurolophus': `${R3}. Subject: Parasaurolophus in scientific profile showing the distinctive hollow head crest, standing beside a prehistoric river, detailed botanical plants in the foreground, Audubon linework, earth tones, white vignette border. ${panda('barely visible among the tall reeds at the river\'s edge in the background', 'pale straw-tan of the dried reed stalks')} ${CLOSE}`,

    'Archaeopteryx': `${R3}. Subject: Archaeopteryx perched on a prehistoric branch, depicted with precise feather detail in the style of an Audubon bird plate, showing transitional features between dinosaur and bird, earth tones, white vignette border. ${bunny('barely visible perched on a branch in the deep background of the tree', 'dark bark-brown and forest shadow of the branch behind the specimen')} ${CLOSE}`,

    'Dimetrodon': `${R3}. Subject: Dimetrodon in full profile showing the dramatic dorsal sail, resting on a prehistoric rocky outcrop, precise scientific linework, earth tones and muted greens, white vignette border, Audubon natural history style. ${panda('barely visible in the rock shadow below the outcrop at the base of the image', 'dark gray-brown of the shadowed rock base and ground')} ${CLOSE}`,

    'Meteor': `${R3}. Subject: a massive meteor streaking across a prehistoric sky above a lush Cretaceous landscape, depicted in precise Victorian scientific illustration style, dinosaur silhouettes visible below, earth tones, white vignette border. ${bunny('barely visible in the distant forest canopy silhouette in the lower background', 'dark forest green of the treetop silhouettes in the distance')} ${CLOSE}`,

    'Amber': `${R3}. Subject: a piece of fossilized amber with a prehistoric insect perfectly preserved inside, depicted in precise scientific illustration style with cross-section details, surrounded by botanical specimens, earth tones, white vignette border. ${panda('barely visible among the small fossilized specimens arranged around the main amber piece', 'warm amber-gold and brown of the fossil specimen arrangement')} ${CLOSE}`,

    'Fossil Fuel': `${R3}. Subject: a cross-section scientific illustration of sedimentary rock layers showing fossil fuels forming, prehistoric plant fossils visible in the strata, precise Victorian geological illustration style, earth tones, white vignette border. ${bunny('barely visible in the darker sedimentary layer band in the background cross-section', 'dark sepia-brown of the coal-bearing rock stratum')} ${CLOSE}`,

    'Bone Club': `${R3}. Subject: a large dinosaur bone depicted in precise natural history illustration style resting on a Victorian specimen tray, anatomical labels in elegant script, other fossil bones arranged around it, earth tones, white vignette border. ${panda('barely visible among the smaller fossil bone specimens on the specimen tray in the background', 'pale ivory-gray of the fossilized bone specimens')} ${CLOSE}`,

    'Fern Bush': `${R3}. Subject: a lush prehistoric fern specimen depicted in precise Audubon botanical illustration style, every frond drawn with scientific accuracy, earth tones and deep jungle green, white vignette border, detailed linework. ${bunny('barely visible nestled at the base of the fern among the leaf litter on the ground', 'pale gray-green and shadow of the debris at the fern\'s base')} ${CLOSE}`,

    'Tar Pit': `${R3}. Subject: a prehistoric tar pit depicted in Victorian natural history illustration style, the dark viscous surface reflecting the pale sky, fossil bones half-submerged at the edges, precise linework, earth tones, white vignette border. ${panda('barely visible among the bones and debris at the far edge of the tar pit', 'dark gray-black of the tar-covered bones and pit edge')} ${CLOSE}`,

    'Volcanic Ash': `${R3}. Subject: a Victorian scientific illustration of a volcanic eruption column with ash cloud spreading across a prehistoric landscape, geological cross-section details, precise linework, muted earth tones, white vignette border. ${bunny('barely visible in the ash-covered ground in the lower background near the vignette border', 'pale gray of the volcanic ash deposit on the prehistoric ground')} ${CLOSE}`,

    'Gigantic Egg': `${R3}. Subject: an enormous dinosaur egg depicted in precise Audubon natural history illustration style on a sandy nest, cross-section view showing the embryo in fine scientific detail, surrounding botanical specimens, earth tones, white vignette border. ${panda('barely visible among the sand and small pebbles of the nest at the base of the image', 'warm tan-gray of the sandy nest material and small stones')} ${CLOSE}`,

    'Carnivore Diet': `${R3}. Subject: a Victorian scientific illustration of a large carnivorous dinosaur skull and jaw with teeth labeled, surrounded by bone specimens and botanical context drawings, precise linework, earth tones, white vignette border. ${bunny('barely visible among the smaller specimen labels and fossil fragments arranged around the skull', 'pale ivory-cream of the specimen labels and fossil bone fragments')} ${CLOSE}`,

    'Stampede': `${R3}. Subject: a herd of dinosaurs stampeding across an open prehistoric plain, depicted in Victorian natural history panorama style showing multiple species in motion, dramatic earth tones, dust rising, white vignette border. ${panda('barely visible in the dust cloud at the far right edge of the stampede', 'warm tan-gray of the billowing prehistoric dust')} ${CLOSE}`,

    'Predator Leap': `${R3}. Subject: a large predatory dinosaur caught mid-leap in a precise Audubon-style scientific illustration, anatomical details accurate and labeled, prehistoric forest behind it, earth tones and jungle greens, white vignette border. ${bunny('barely visible in the dense undergrowth in the deep background', 'dark jungle green and shadow of the prehistoric forest floor')} ${CLOSE}`,

    'Meteor Strike': `${R3}. Subject: the Cretaceous-Paleogene extinction event depicted as a precise Victorian scientific illustration, the meteor impact visible at the horizon, shockwave and fire spreading across a prehistoric landscape, earth tones, white vignette border. ${panda('barely visible in the foreground vegetation at the vignette border edge', 'dark shadow green and brown of the prehistoric ground cover near the border')} ${CLOSE}`,

    'Swamp Slow': `${R3}. Subject: a large dinosaur moving slowly through a dark prehistoric swamp, precise natural history illustration style, dense vegetation reflected in the still dark water, earth tones and deep jungle green, white vignette border. ${bunny('barely visible among the floating water plants and debris at the swamp\'s surface in the background', 'dark green-gray of the floating swamp vegetation')} ${CLOSE}`,

    'Ice Age': `${R3}. Subject: a Victorian scientific illustration of a prehistoric Ice Age landscape, woolly mammoth silhouettes visible in the distance, glacial formations in precise geological illustration style, pale gray and white tones, white vignette border. ${panda('barely visible among the snow and ice debris at the glacier\'s edge in the lower background', 'pale blue-white of the snow and ice formation')} ${CLOSE}`,

    'Mutation': `${R3}. Subject: a Victorian scientific comparative illustration showing evolutionary mutation, two related prehistoric specimens side-by-side with anatomical differences labeled in elegant script, precise linework, earth tones, white vignette border. ${bunny('barely visible among the scientific notation and small reference specimens in the corner of the illustration', 'pale ivory of the reference specimens and notation paper')} ${CLOSE}`,

    'Fossilized Echo': `${R3}. Subject: a perfectly preserved prehistoric fossil imprinted in a slab of stone, depicted in precise Victorian scientific illustration style with cross-section geological context, every detail of the fossil visible, earth tones, white vignette border. ${panda('barely visible in the stone slab surface texture in the background around the main fossil', 'pale gray-tan of the sedimentary stone surface')} ${CLOSE}`,

    'Extinction Event': `${R3}. Subject: a dramatic Victorian scientific panorama illustration of the extinction event — a dark sky, raining ash, last dinosaur silhouettes in the distance, a lone surviving fern in the foreground, earth tones, white vignette border. ${bunny('barely visible among the ash-covered ground debris at the base of the surviving fern', 'pale gray of the volcanic ash coating the ground')} ${CLOSE}`,
  },

  4: {
    'Astronaut': `${R4}. Subject: an astronaut in a gleaming geometric spacesuit floating in deep space, Earth visible below, retro NASA geometric design aesthetic, electric cyan visor reflection, deep navy background, cosmic scale. ${panda('barely visible reflected as a tiny shape in the astronaut\'s curved visor', 'pale silver-white of the helmet visor reflection')} ${CLOSE}`,

    'Alien Queen': `${R4}. Subject: an alien queen depicted in 1960s pulp sci-fi illustration style, geometric bioluminescent crown, commanding pose aboard a geometric retro spacecraft bridge, electric cyan and silver, deep navy background. ${bunny('barely visible in the shadows behind a geometric control panel in the background', 'dark navy-blue of the unlit spacecraft panel shadow')} ${CLOSE}`,

    'Pulsar': `${R4}. Subject: a pulsar star depicted as a precise geometric rotating beacon of electric cyan light in deep space, perfectly regular beams sweeping outward, retro NASA concept art aesthetic, deep navy background. ${panda('barely visible in the geometric beam pattern at the edge of the image', 'pale silver-cyan of the faintest outer beam radiation')} ${CLOSE}`,

    'Nebula': `${R4}. Subject: a vast cosmic nebula in retro NASA concept art style, sweeping geometric color bands of electric cyan and silver against deep navy, stars embedded in the gas cloud, cosmic scale, bold graphic illustration. ${bunny('barely visible in the darker region of the nebula cloud in the upper background', 'dark navy-blue of the dense nebula gas cloud shadow')} ${CLOSE}`,

    'Comet': `${R4}. Subject: a comet with a dramatic geometric tail of electric cyan and silver streaking across deep navy space, retro 1960s sci-fi illustration aesthetic, graphic and bold, cosmic scale. ${panda('barely visible in the geometric tail particles at the far trailing edge of the comet', 'pale silver-white of the comet tail dust stream')} ${CLOSE}`,

    'Space Station': `${R4}. Subject: a retro geometric space station in 1960s NASA concept art style, modular cylindrical sections with solar panels, Earth visible below, electric cyan and silver against deep navy space. ${bunny('barely visible in the shadow between two station modules in the background', 'dark navy of the space between the geometric station modules')} ${CLOSE}`,

    'Cosmonaut': `${R4}. Subject: a Soviet-era cosmonaut in geometric retro spacesuit design on a spacewalk, geometric spacecraft hull behind, electric silver and cyan details, deep navy space background, retro 1960s sci-fi aesthetic. ${panda('barely visible attached to the spacecraft hull in the background as a small geometric shape', 'dark gray-silver of the spacecraft hull panel surface')} ${CLOSE}`,

    'Moon Rock': `${R4}. Subject: a collection of moon rocks arranged on a geometric NASA specimen tray, electric silver and gray against a deep navy background, retro space program illustration style, technical labels in 1960s graphic design. ${bunny('barely visible among the smaller rock specimens at the edge of the specimen tray', 'pale gray of the moon rock surface and specimen tray')} ${CLOSE}`,

    'Space Junk': `${R4}. Subject: a field of geometric space debris orbiting Earth, broken satellite pieces and retro rocket fragments, electric cyan and silver glinting in sunlight, deep navy space and Earth below, retro NASA illustration style. ${panda('barely visible among the debris field at the far edge of the image', 'pale silver-gray of the tumbling space debris')} ${CLOSE}`,

    'Void': `${R4}. Subject: a region of pure cosmic void depicted in 1960s space illustration style, surrounding stars and light bending inward toward the darkness at the center, electric cyan light rimming the darkness, deep navy background, cosmic scale. ${bunny('barely visible in the darkest region of the void at the center of the image', 'near-black navy of the deepest void darkness')} ${CLOSE}`,

    'Martian': `${R4}. Subject: a Martian creature in 1960s pulp sci-fi illustration style, depicted with bold geometric alien design on the surface of Mars, retro red planet landscape behind it, electric cyan and silver accent colors. ${panda('barely visible in the Mars rock formation in the background', 'rust red-brown of the Martian rock surface')} ${CLOSE}`,

    'Quasar': `${R4}. Subject: a quasar depicted in retro NASA concept art style, a brilliant geometric core of electric cyan and white light with jets of energy shooting outward, deep navy galactic background, cosmic scale. ${bunny('barely visible in the geometric energy jet at the far edge of the image', 'pale silver-cyan of the faintest outer jet radiation')} ${CLOSE}`,

    'Satellite': `${R4}. Subject: a retro geometric satellite in 1960s NASA design style, solar panels deployed, Earth visible below, electric cyan solar array details against deep navy space, bold graphic illustration style. ${panda('barely visible in the shadow of the solar panel structure', 'dark navy of the satellite shadow between panel segments')} ${CLOSE}`,

    'Dark Matter': `${R4}. Subject: dark matter depicted in 1960s sci-fi illustration style as an invisible gravitational force bending starlight into geometric lensing arcs, deep navy background with warped star patterns, electric cyan light bending. ${bunny('barely visible within the gravitational lens arc distortion in the background star field', 'dark navy-blue of the deep space background between the lensed star arcs')} ${CLOSE}`,

    'Oxygen Tank': `${R4}. Subject: a geometric retro NASA oxygen tank in 1960s space program illustration style, electric silver and white against a deep navy spacecraft interior background, technical labels in period graphic design. ${panda('barely visible in the shadow behind the tank against the spacecraft wall', 'dark navy-gray of the spacecraft interior wall shadow')} ${CLOSE}`,

    'Space Food': `${R4}. Subject: retro NASA space food packets and squeeze tubes arranged in a geometric composition in 1960s illustration style, electric silver and white against deep navy spacecraft interior, bold period graphic design. ${bunny('barely visible behind the food packet arrangement against the spacecraft wall', 'dark navy of the spacecraft wall shadow behind the supplies')} ${CLOSE}`,

    'Jetpack': `${R4}. Subject: a sleek geometric retro jetpack in 1960s NASA concept art style, silver exhaust cones firing electric cyan thrust, astronaut silhouette using it in deep navy space, bold graphic illustration. ${panda('barely visible in the exhaust trail behind the jetpack at the edge of the image', 'pale silver-cyan of the fading propellant trail')} ${CLOSE}`,

    'Star Map': `${R4}. Subject: a retro geometric star map in 1960s NASA illustration style, constellations connected by precise silver lines, deep navy background, electric cyan constellation markers, bold graphic design aesthetic. ${bunny('barely visible in the deep background star field at the corner of the map', 'pale silver-white of the distant background star points')} ${CLOSE}`,

    'Radiation': `${R4}. Subject: radiation depicted in 1960s sci-fi illustration style as geometric concentric rings of electric cyan and silver emanating from a cosmic source, deep navy space background, bold graphic style, cosmic scale. ${panda('barely visible in the outermost ring of the radiation pattern at the image edge', 'pale silver-cyan of the fading outer radiation ring')} ${CLOSE}`,

    'Gravity Well': `${R4}. Subject: a gravity well depicted in retro 1960s NASA illustration style as a geometric grid deforming into a funnel in deep navy space, electric cyan grid lines, stars bending around the well, cosmic scale. ${bunny('barely visible in the geometric grid pattern at the far edge of the well', 'pale silver-cyan of the outermost undistorted grid lines')} ${CLOSE}`,

    'Antimatter': `${R4}. Subject: antimatter depicted in 1960s pulp sci-fi illustration style as a contained burst of inverse light in a geometric containment vessel, electric cyan and silver, deep navy background, bold graphic design. ${panda('barely visible in the shadow behind the containment vessel in the background', 'dark navy-gray of the background behind the vessel')} ${CLOSE}`,

    'Warp Core': `${R4}. Subject: a retro geometric warp core in 1960s sci-fi concept art style, a pulsing electric cyan column of light in a geometric cylindrical chamber, silver engineering details, deep navy background. ${bunny('barely visible in the shadow at the base of the warp core chamber below the glow', 'dark navy of the lower chamber shadow beneath the light column')} ${CLOSE}`,

    'Orbit': `${R4}. Subject: a spacecraft in a perfect geometric orbital path around Earth, depicted in 1960s NASA concept art style, electric cyan orbital path lines, deep navy space, Earth below with precise geographic linework. ${panda('barely visible on the spacecraft hull in the geometric orbital diagram', 'pale silver of the spacecraft hull surface detail')} ${CLOSE}`,

    'Supernova': `${R4}. Subject: a supernova explosion in retro NASA concept art style, a geometric burst of electric cyan and silver light expanding outward in perfect rings from a stellar core, deep navy space background, cosmic scale. ${bunny('barely visible in the outermost expanding ring of the supernova at the image edge', 'pale silver-cyan of the fading outer explosion wave')} ${CLOSE}`,

    'Big Bang': `${R4}. Subject: the Big Bang depicted in 1960s scientific illustration style as a geometric explosion of light from a central point, electric cyan and silver rays expanding outward against deep navy void, cosmic scale. ${panda('barely visible in the geometric ray pattern at the very edge of the explosion', 'pale silver-white of the outermost faintest expansion rays')} ${CLOSE}`,

    'Atmospheric Drag': `${R4}. Subject: a spacecraft re-entering Earth\'s atmosphere in 1960s NASA concept art style, geometric heat shield glowing electric cyan-white against a dramatic atmospheric glow, Earth curving below, deep navy above. ${bunny('barely visible in the geometric heat trail behind the spacecraft at the image edge', 'pale cyan-silver of the fading re-entry heat signature')} ${CLOSE}`,

    'Event Horizon': `${R4}. Subject: a black hole event horizon in retro 1960s sci-fi illustration style, a perfect geometric circle of absolute darkness surrounded by a brilliant electric cyan accretion disk, deep navy background, cosmic scale. ${panda('barely visible in the dark accretion disk shadow just outside the event horizon', 'near-black navy of the accretion disk shadow region')} ${CLOSE}`,

    'Antimatter Pulse': `${R4}. Subject: an antimatter pulse depicted in 1960s pulp sci-fi style as a geometric shockwave of inverted electric cyan light expanding outward in perfect rings, deep navy space background, cosmic scale, bold graphic design. ${bunny('barely visible in the outermost ring of the pulse wave at the image edge', 'pale silver-cyan of the fading outer pulse ring')} ${CLOSE}`,

    'Black Hole': `${R4}. Subject: a black hole depicted as a perfect geometric void surrounded by an accretion disk of electric cyan and silver light spiraling inward in concentric geometric arcs, deep navy background, stars warping at the edges, cosmic scale. ${panda('barely visible in a dark dust cloud in the far upper corner of the image', 'dark navy-gray of the surrounding cosmic cloud shadow')} ${CLOSE}`,

    'Gravity Sling': `${R4}. Subject: a spacecraft executing a gravity slingshot maneuver around a planet in 1960s NASA concept art style, geometric trajectory lines shown in electric cyan, planet surface visible below, deep navy space, cosmic scale. ${bunny('barely visible in the geometric trajectory arc at the far edge of the image', 'pale silver-cyan of the faintest outer trajectory line')} ${CLOSE}`,
  },

  5: {
    'Rock Star': `${R5}. Subject: a rock star in full Art Deco geometric stage glory, dramatic silhouette against a psychedelic swirling backdrop of neon colors on black, geometric spotlight beams, bold Art Nouveau curves, 1970s album cover style. ${panda('barely visible in the geometric stage lighting pattern in the lower background', 'dark background black of the stage floor between the light beams')} ${CLOSE}`,

    'DJ': `${R5}. Subject: a DJ behind a geometric Art Deco turntable setup, vinyl records depicted as bold geometric circles, neon color waves emanating from the decks, swirling psychedelic color gradients on black background, bold outlines. ${bunny('barely visible in the concentric circle pattern of a vinyl record in the background', 'dark black of the vinyl record groove pattern')} ${CLOSE}`,

    'Conductor': `${R5}. Subject: an orchestral conductor depicted in Art Deco poster style, baton raised, geometric sound waves emanating outward in bold psychedelic swirls, vibrant neons on black, musical notation elements integrated into the design. ${panda('barely visible in the geometric sound wave pattern at the lower edge of the image', 'dark background black of the space between the wave lines')} ${CLOSE}`,

    'Bassist': `${R5}. Subject: a bassist depicted in 1970s psychedelic album cover style, bold geometric bass guitar shape, low frequency sound waves shown as massive geometric ripples, vibrant neon colors on black, Art Deco aesthetic. ${bunny('barely visible in the geometric ripple pattern at the far edge of the image', 'dark background black between the outermost sound wave lines')} ${CLOSE}`,

    'Drummer': `${R5}. Subject: a drummer in Art Deco geometric style, drum kit depicted as bold geometric circles and cylinders, cymbal splashes as geometric starburst shapes, neon colors on black, swirling psychedelic rhythm patterns. ${panda('barely visible in the geometric cymbal splash pattern in the upper background', 'dark background black between the geometric cymbal rays')} ${CLOSE}`,

    'Violinist': `${R5}. Subject: a violinist depicted in Art Nouveau meets psychedelic 1970s style, violin curves becoming flowing geometric patterns, musical notation swirling into abstract designs, vibrant neons on black background, bold linework. ${bunny('barely visible in the flowing musical notation pattern in the background', 'dark background black between the swirling notation curves')} ${CLOSE}`,

    'Rapper': `${R5}. Subject: a rapper in bold Art Deco geometric style, microphone depicted as a geometric chrome object, sound waves shown as sharp geometric angles and bold neon typography shapes, psychedelic neons on black, 1970s aesthetic. ${panda('barely visible in the geometric speaker grille pattern in the background', 'dark background black of the speaker cone shadow')} ${CLOSE}`,

    'Roadie': `${R5}. Subject: a roadie depicted in 1970s concert poster style carrying a massive speaker cabinet, geometric equipment shapes, neon stage lighting creating Art Deco light beam patterns, vibrant neons on dark background. ${bunny('barely visible in the geometric equipment stack in the far background', 'dark shadow of the backstage area between the equipment cases')} ${CLOSE}`,

    'One-Hit Wonder': `${R5}. Subject: a single gleaming gold record on a wall displayed in Art Deco style, geometric frame with psychedelic swirling color gradients radiating outward from the record, neon colors on black, bold 1970s design. ${panda('barely visible in the geometric swirl pattern at the lower corner of the image', 'dark background black between the outer swirl lines')} ${CLOSE}`,

    'Music Critic': `${R5}. Subject: a music critic depicted in 1970s psychedelic style, notebook in hand, surrounded by swirling geometric musical notation and abstract score fragments, neon colors on black, bold Art Deco linework. ${bunny('barely visible in the geometric score notation pattern in the background', 'dark background black between the swirling notation bars')} ${CLOSE}`,

    'Groupie': `${R5}. Subject: a concert crowd depicted as a sea of geometric silhouetted figures in Art Deco style, arms raised, neon stage lighting creating bold geometric beam patterns above, psychedelic color gradients, vibrant neons on black. ${panda('barely visible in the crowd of geometric silhouettes in the far background', 'dark background black of the unlit crowd area behind')} ${CLOSE}`,

    'Sound Engineer': `${R5}. Subject: a sound engineer at a massive geometric mixing console in 1970s studio style, sliding faders shown as Art Deco geometric columns, VU meters as bold neon arcs, psychedelic color gradients, neons on black. ${bunny('barely visible behind the mixing console in the shadow of the studio background', 'dark shadow of the studio wall behind the equipment')} ${CLOSE}`,

    'Producer': `${R5}. Subject: a music producer in a recording studio depicted in Art Deco style, bold geometric studio glass separating the producer from the performer, neon meters and controls, psychedelic swirling patterns, neons on black. ${panda('barely visible in the reflection of the studio glass in the background', 'dark shadow reflection in the studio window glass')} ${CLOSE}`,

    'Tone-Deaf Singer': `${R5}. Subject: a dramatically off-key singer depicted in 1970s psychedelic style, musical notes shown as chaotic geometric shapes flying in wrong directions, surrounding band members reacting, neon colors on black, bold Art Deco style. ${bunny('barely visible in the chaotic geometric note pattern at the edge of the image', 'dark background black between the scattered geometric note shapes')} ${CLOSE}`,

    'Guitar Riff': `${R5}. Subject: an electric guitar depicted in bold Art Deco geometric style, a blazing riff shown as geometric lightning bolts and neon waveforms emanating from the frets, psychedelic color gradients on black, 1970s album art. ${panda('barely visible in the geometric waveform pattern at the far edge of the image', 'dark background black between the outer waveform lines')} ${CLOSE}`,

    'Bass Drop': `${R5}. Subject: a massive sound wave rippling outward from a glowing bass speaker, shown as bold geometric concentric arcs in electric blue and purple, Art Deco design, psychedelic color gradients on black, 1970s style. ${bunny('barely visible in the geometric wave pattern at the lower edge of the image', 'dark background black between the outermost concentric wave arcs')} ${CLOSE}`,

    'High Note': `${R5}. Subject: a high musical note depicted in Art Deco style as a geometric burst of golden light, bold geometric sound wave lines shooting upward in sharp angles, psychedelic neon gradients on black, 1970s album cover aesthetic. ${panda('barely visible in the geometric ray pattern at the top edge of the image', 'dark background black between the high note ray lines at the edge')} ${CLOSE}`,

    'Earplugs': `${R5}. Subject: a pair of earplugs depicted in Art Deco geometric style, shown as two bold cylinders with psychedelic swirling sound-blocking patterns, chaotic geometric sound waves blocked on one side, neons on black, 1970s design. ${bunny('barely visible in the blocked sound wave pattern on the silent side of the earplugs', 'dark background black of the sound-blocked region')} ${CLOSE}`,

    'Off-Key Verse': `${R5}. Subject: musical notes depicted in bold Art Deco style going dramatically off-key — the notation shown as geometric shapes veering off their staff lines, psychedelic chaotic color gradients, neons on black, 1970s album art aesthetic. ${panda('barely visible in the geometric staff line pattern in the background of the score', 'dark background black between the musical staff lines')} ${CLOSE}`,

    'Broken String': `${R5}. Subject: a broken guitar string depicted in Art Deco style, the snapped string shown as a geometric explosive burst, energy waves radiating outward in bold neon shapes, psychedelic color gradients on black, 1970s style. ${bunny('barely visible in the geometric burst pattern at the far edge of the broken string explosion', 'dark background black between the outer burst lines')} ${CLOSE}`,

    'Platinum Record': `${R5}. Subject: a platinum record displayed in a bold Art Deco frame, geometric platinum surface reflecting psychedelic neon colors in circular patterns, bold geometric decorative border, neons on black, 1970s design. ${panda('barely visible in the geometric reflection pattern on the platinum record surface', 'dark background black of the unreflected center of the record surface')} ${CLOSE}`,

    'Stadium Sound': `${R5}. Subject: a massive stadium concert depicted in Art Deco style, geometric sound waves filling the space from stage to crowd, neon beam patterns, psychedelic swirling color gradients above the crowd, bold linework, neons on black. ${bunny('barely visible in the geometric crowd silhouette pattern in the far background of the stadium', 'dark background black of the upper stadium seating in shadow')} ${CLOSE}`,

    'Encore': `${R5}. Subject: a concert encore moment depicted in 1970s psychedelic poster style, crowd silhouettes with hands raised, bold geometric spotlight beams crossing above, swirling Art Deco energy patterns, vibrant neons on black. ${panda('barely visible in the geometric spotlight beam crossing pattern at the top of the image', 'dark background black between the crossing spotlight beams')} ${CLOSE}`,

    'Music Festival': `${R5}. Subject: a music festival depicted as a bold Art Deco aerial scene, geometric stage shapes and crowd patterns, psychedelic color zones, neon banner shapes, swirling music waves, vibrant neons on dark background, 1970s style. ${bunny('barely visible in the geometric crowd pattern at the far edge of the festival field', 'dark background of the field beyond the lit festival area')} ${CLOSE}`,

    'Number One Hit': `${R5}. Subject: a bold Art Deco number one chart position depicted as a geometric trophy and rising chart lines, psychedelic swirling neon colors radiating from the peak, bold 1970s album art design, vibrant neons on black. ${panda('barely visible in the geometric chart line pattern at the lower edge of the rising chart', 'dark background black between the lower chart line bars')} ${CLOSE}`,

    'Acoustic Set': `${R5}. Subject: an acoustic guitar depicted in Art Nouveau style with psychedelic 1970s color treatment, geometric sound hole patterns, flowing organic curves contrasting with bold geometric sound wave shapes, neons on black. ${bunny('barely visible in the geometric soundhole pattern within the guitar body', 'dark interior black of the acoustic guitar body soundhole')} ${CLOSE}`,

    'Sound Check': `${R5}. Subject: a sound check depicted in 1970s concert style, geometric microphone and speaker shapes, bold Art Deco test tone patterns as geometric waveform displays, neon VU meter arcs, psychedelic neons on dark background. ${panda('barely visible in the geometric test tone waveform pattern at the edge of the display', 'dark background black between the outermost waveform lines')} ${CLOSE}`,

    'Feedback Loop': `${R5}. Subject: guitar feedback depicted in Art Deco style as a geometric spiral of increasing neon sound waves, electric and chaotic geometric patterns, psychedelic neon color gradients cycling through the spiral, vibrant neons on black. ${bunny('barely visible in the geometric spiral at the outermost loop of the feedback spiral', 'dark background black between the outer spiral lines')} ${CLOSE}`,

    'Remix': `${R5}. Subject: a remix depicted in 1970s psychedelic style as two geometric musical waveforms merging and transforming into a third new pattern, bold Art Deco linework, vibrant neon color gradients on black, swirling design. ${panda('barely visible in the geometric merge point between the two waveforms', 'dark background black in the transition zone between the two wave patterns')} ${CLOSE}`,

    'Cancel Culture': `${R5}. Subject: a bold Art Deco geometric X shape canceling a music note, psychedelic swirling neon colors on black, the canceled note shown as a geometric shape dissolving at the edges, 1970s graphic design aesthetic, bold outlines. ${bunny('barely visible in the geometric dissolving note pattern at the edge of the cancelled zone', 'dark background black between the dissolving geometric note fragments')} ${CLOSE}`,
  },

  6: {
    'Zombie Horde': `${R6}. Subject: a massive swarm of cartoon zombies shuffling forward down a foggy suburban street at night, amber streetlights glowing, the crowd filling the scene from edge to edge, expressive faces, bold outlines, muted green and purple tones. ${panda('barely visible wedged in the window of a darkened house in the far background', 'dark gray-purple tones of the shuttered window frame and shadow')} ${CLOSE}`,

    'Undead Knight': `${R6}. Subject: a cartoon undead knight in tattered but ornate purple-gray armor, standing dramatically with a glowing green sword, cobwebs on the pauldrons, a rusted crown askew on the helmet, fog-filled castle corridor behind it, amber torch light. ${bunny('barely visible in the shadows behind the knight at the base of the far stone wall', 'dark gray-purple of the castle stonework')} ${CLOSE}`,

    'Brain Eater': `${R6}. Subject: a cartoonishly exaggerated zombie with enormous hungry eyes and arms outstretched, stumbling forward through a foggy graveyard, tombstones visible behind it, muted green and purple palette, bold outlines, expressive and silly, Goosebumps style. ${panda('barely visible peeking from behind a mossy tombstone in the deep background', 'mossy gray-green of the stone surface')} ${CLOSE}`,

    'Shambler': `${R6}. Subject: a slow-moving cartoon zombie in tattered gray clothes, arms hanging limply, dragging one foot across a cracked empty parking lot at night, amber streetlights in the background, bold black outlines, muted purple and gray palette. ${bunny('barely visible slumped against a parking divider in the far background', 'pale concrete gray and shadow of the parking lot')} ${CLOSE}`,

    'Rotting Corpse': `${R6}. Subject: a cartoonish zombie slumped against a graveyard fence in tattered formal clothes, wilting flowers around it, looking very worse-for-wear but comically so, muted purple and gray tones, bold outlines, spooky-cute Goosebumps style. ${panda('barely visible tucked behind the fence post in the deep background', 'dark gray-brown of the weathered wood fence')} ${CLOSE}`,

    'Plague Doctor': `${R6}. Subject: a cartoonishly dramatic plague doctor in a long dark coat with an oversized bird-beak mask and wide-brimmed hat, holding a gnarled walking stick, standing in a foggy cobblestone alley with flickering amber lanterns, bold black outlines. ${bunny('barely visible peeking from behind a chimney in the upper background', 'dark gray-purple of the foggy stonework and chimney')} ${CLOSE}`,

    'Survivor': `${R6}. Subject: a determined cartoon teenager in a hoodie and backpack standing defiantly on a rooftop, flashlight beam cutting through foggy zombie-filled streets below, bold outlines, amber light and cool purple shadow contrast, Goosebumps style. ${panda('barely visible clipped to the outside of the survivor\'s backpack', 'dark navy-gray of the backpack fabric')} ${CLOSE}`,

    'Undead Child': `${R6}. Subject: a cartoonish small zombie child in tattered pajamas with a lopsided grin, floating a few inches off the ground in a dark hallway lit by amber light, purple shadow tones, spooky-cute expression, bold outlines, Goosebumps style, no gore. ${bunny('barely visible sitting at the far end of the dark hallway in the background', 'deep blue-purple of the unlit corridor shadow')} ${CLOSE}`,

    'Necromancer': `${R6}. Subject: a dramatic cartoon necromancer in flowing purple robes, arms raised to summon glowing green spirits rising from the ground around them, misty graveyard at night, amber moon above, bold black outlines, Goosebumps style. ${panda('barely visible sitting atop a distant tombstone in the far background', 'dark gray-green of the mist-covered stone')} ${CLOSE}`,

    'Ghoul': `${R6}. Subject: a lanky cartoonish ghoul crouching on a gravestone with enormous ears and glowing green eyes, long fingers splayed dramatically, foggy cemetery at night, amber moonlight, muted green and gray tones, bold outlines, Goosebumps style. ${bunny('barely visible tucked between two weathered tombstones in the background', 'pale gray stone and shadow of the cemetery')} ${CLOSE}`,

    'Skeleton': `${R6}. Subject: a friendly-looking cartoon skeleton in a tattered suit grinning wide and waving, standing in a spooky-but-cheerful graveyard with jack-o-lanterns and autumn leaves around it, amber and gray palette, bold outlines, Goosebumps style. ${panda('barely visible resting against a jack-o-lantern in the background', 'warm amber-orange and dark shadow of the Halloween scene')} ${CLOSE}`,

    'Zombie Cheerleader': `${R6}. Subject: a cartoon zombie cheerleader in a tattered purple and gray uniform with one pom-pom raised, enthusiastic but decrepit expression, foggy football field in the background, amber stadium lights, bold outlines, Goosebumps style. ${bunny('barely visible at the far end of the foggy field in the background', 'pale misty gray-green of the distant foggy grass')} ${CLOSE}`,

    'Infected Mayor': `${R6}. Subject: a cartoon zombie in a tattered suit and campaign banner sash, holding a nameplate and waving at no one, foggy town hall steps behind them, amber lanterns on either side, muted purple and gray palette, bold outlines, Goosebumps style. ${panda('barely visible carved as a tiny relief into the decorative stonework above the town hall entrance in the background', 'pale gray of the stone facade relief carvings')} ${CLOSE}`,

    'Patient Zero': `${R6}. Subject: a cartoon figure in a tattered hospital gown slumped dramatically in a chair, a mysterious glowing green aura around them, knocked-over IV stand nearby, dark hospital corridor with amber emergency lighting behind, bold outlines, Goosebumps style. ${bunny('barely visible sitting on a hospital shelf in the dark corridor background', 'pale gray-blue of the hospital equipment and shadow')} ${CLOSE}`,

    'First Aid Kit': `${R6}. Subject: a cartoon first aid kit lying open on a rough wooden surface with bandages and supplies spilling out, amber lantern light illuminating it against a dark foggy apocalypse background, bold outlines, muted green and gray palette, Goosebumps style. ${panda('barely visible in the shadow behind the kit on the wooden shelf', 'dark brown-gray of the wooden surface shadow')} ${CLOSE}`,

    'Barricade': `${R6}. Subject: a cartoon barricade of stacked furniture and wooden planks shoved against a door, a pair of hands pressing it from the safe side, warm amber light inside, purple shadow and fog visible under the door, bold outlines, Goosebumps style. ${bunny('barely visible wedged between pieces of furniture in the barricade', 'pale gray-blue of the furniture surfaces in shadow')} ${CLOSE}`,

    'Crowbar': `${R6}. Subject: a cartoon crowbar wedged between wooden boards being pried apart dramatically, nails flying outward, an amber flashlight beam illuminating the scene in a dark setting, gray and purple shadows, bold outlines, Goosebumps style. ${panda('barely visible among the debris on the shadowy floor in the background', 'dark gray of the floor shadow and wood debris')} ${CLOSE}`,

    'Torch': `${R6}. Subject: a cartoon handheld flashlight torch blazing with amber light being held aloft in a dark purple foggy graveyard at night, casting dramatic long shadows on nearby tombstones, warm amber and cool gray contrast, bold outlines, Goosebumps style. ${bunny('barely visible sitting on a tombstone at the far background edge of the torchlight', 'pale gray stone where the amber light barely reaches')} ${CLOSE}`,

    'Rotten Flesh': `${R6}. Subject: a cartoon plate of clearly unappetizing greenish food — zombie-themed but cartoonish and not gory — on a rickety table with an amber lantern, foggy dark background, bold outlines, muted green and gray, Goosebumps gross-out style. ${panda('barely visible in the shadow behind the plate on the table', 'dark gray-brown of the shadowed tabletop')} ${CLOSE}`,

    'Zombie Bite': `${R6}. Subject: a cartoon illustration of a bandaged arm with a dramatic cartoonish bite mark indent on it, the injury depicted in Goosebumps style — spooky but not gory, the arm held up dramatically against an amber-lit background, purple shadows, bold outlines. ${bunny('barely visible in the background leaning against a wall behind the arm', 'pale gray-purple of the shadowed wall surface')} ${CLOSE}`,

    'Military Rations': `${R6}. Subject: a cartoon military supply crate cracked open to reveal neatly stacked food rations and supplies, an amber flashlight beam illuminating it inside a dark shelter, bold outlines, gray and green palette, Goosebumps survival-cartoon style. ${panda('barely visible inside the supply crate partially hidden under packaging and supplies', 'gray-green of the military packaging and crate interior shadow')} ${CLOSE}`,

    'Defibrillator': `${R6}. Subject: a cartoon defibrillator machine with a dramatic electric spark crackling between the paddles, cartoon lightning bolts in amber and purple, used in a dark cartoon hospital setting, bold outlines, Goosebumps style spooky-fun tone. ${bunny('barely visible in the shadows behind the machine against the hospital wall', 'dark blue-gray of the hospital equipment and background shadow')} ${CLOSE}`,

    'Brain Feast': `${R6}. Subject: a cartoonish dining scene of zombie figures seated around a candle-lit table with exaggerated expressions, amber candlelight casting dramatic shadows in an eerie dining room, bold outlines, muted purple and gray tones, Goosebumps style. ${panda('barely visible in the shadowy corner behind the curtains of the dining room', 'dark purple-gray of the heavy curtains and room corner shadow')} ${CLOSE}`,

    'Zombie Apocalypse': `${R6}. Subject: a dramatic wide-angle cartoon scene of a dark city street filled with cartoon zombies stretching into the foggy distance, amber emergency lights flickering on buildings, purple fog, overwhelming scale, bold outlines, Goosebumps style. ${bunny('barely visible in a window of a building in the far background', 'pale gray-blue of the unlit window glass and dark building facade')} ${CLOSE}`,

    'Undead Army': `${R6}. Subject: a vast cartoon army of zombies marching in formation over a hill at night, moonlit purple-gray sky above, amber torches held by the front row, dramatic scale suggesting an unstoppable horde, bold outlines, Goosebumps epic illustration style. ${panda('barely visible at the very back of the marching army on the hilltop', 'dark silhouette purple-gray of the distant zombie shapes on the horizon')} ${CLOSE}`,

    'Decompose': `${R6}. Subject: a cartoon nature-science illustration of autumn leaves and plants decomposing into rich earth in a time-lapse style, muted greens and grays, amber light filtering through bare branches above, the image conveying decay in a spooky-cartoon style, bold outlines. ${bunny('barely visible nestled among the decomposing leaves in the lower corner of the scene', 'pale gray-green of the decomposing leaf litter')} ${CLOSE}`,

    'Brain Fog': `${R6}. Subject: a cartoon brain surrounded by swirling purple fog and cartoon question marks, floating in a haze of purple and gray, amber light attempting to cut through the fog, dazed cartoon expression on the brain, bold outlines, Goosebumps spooky-cute style. ${panda('barely visible in the swirling fog at the edge of the image', 'pale purple-gray of the foggy atmosphere surrounding the brain')} ${CLOSE}`,

    'Resurrection': `${R6}. Subject: a cartoon zombie rising dramatically from a fresh grave in a moonlit graveyard, arms reaching upward, startled wide-eyed expression, purple-gray sky, amber moonlight, dirt flying dramatically, bold outlines, Goosebumps style, spooky-fun tone. ${bunny('barely visible sitting at the base of a nearby tombstone in the background', 'pale gray of the mossy tombstone surface and shadow')} ${CLOSE}`,

    'Undead Rising': `${R6}. Subject: a dramatic cartoon scene of multiple cartoon zombies simultaneously rising from glowing purple-green graves across a cemetery at night, silhouettes emerging in several places, amber moonlight above, bold outlines, epic Goosebumps illustration style. ${panda('barely visible perched on a tombstone in the deep background of the cemetery', 'dark gray-purple of the shadowed tombstone surface and night fog')} ${CLOSE}`,

    'Horde': `${R6}. Subject: a massive cartoon zombie horde filling the entire scene from edge to edge, stretching into the foggy purple distance, amber and green glow from above illuminating the crowd, individual cartoon expressions visible in the foreground, bold outlines, overwhelming scale, Goosebumps epic style. ${bunny('barely visible on a distant rooftop ledge in the upper background above the horde', 'pale gray-purple of the twilight sky and rooftop edge')} ${CLOSE}`,
  },

};

// ── Generation & upload ───────────────────────────────────────────────────

async function generateAndUpload(releaseNum: number, cardId: number, cardName: string, prompt: string) {
  console.log(`  Generating: ${cardName}`);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { responseModalities: ['IMAGE', 'TEXT'] } as any,
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!img?.inlineData?.data) throw new Error(`No image returned for ${cardName}`);
  const buffer = Buffer.from(img.inlineData.data, 'base64');

  const outputDir = `./art-output/release-${releaseNum}`;
  fs.mkdirSync(outputDir, { recursive: true });
  const safeName = cardName.replace(/[^a-zA-Z0-9]/g, '-');
  const localPath = path.join(outputDir, `${cardId}-${safeName}.png`);
  fs.writeFileSync(localPath, buffer);
  console.log(`    Saved: ${localPath}`);

  const storagePath = `cards/release-${releaseNum}/${cardId}.png`;
  const { error: uploadError } = await supabase.storage
    .from('card-art')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('card-art').getPublicUrl(storagePath);
  const { error: dbError } = await supabase
    .from('cards')
    .update({ art_url: urlData.publicUrl })
    .eq('id', cardId);
  if (dbError) throw dbError;

  console.log(`    ✓ ${urlData.publicUrl}`);
}

async function runRelease(releaseNum: number) {
  const releasePrompts = PROMPTS[releaseNum];
  if (!releasePrompts) {
    console.log(`No prompts defined for release ${releaseNum} — skipping.`);
    return;
  }

  // Look up the release's DB id (release number maps to releases.number, not necessarily releases.id)
  const { data: release } = await supabase
    .from('releases')
    .select('id')
    .eq('number', releaseNum)
    .single();
  if (!release) { console.error(`Release ${releaseNum} not found in DB`); return; }

  const { data: cards } = await supabase
    .from('cards')
    .select('id, name')
    .eq('release_id', release.id)
    .order('id');
  if (!cards?.length) { console.error(`No cards found for release ${releaseNum}`); return; }

  console.log(`\n── Release ${releaseNum} (${cards.length} cards) ─────────────────────────`);
  for (const card of cards) {
    const prompt = releasePrompts[card.name];
    if (!prompt) { console.warn(`  ⚠ No prompt for: "${card.name}" — skipping`); continue; }
    try {
      await generateAndUpload(releaseNum, card.id, card.name, prompt);
    } catch (e: any) {
      console.error(`  ✗ Error (${card.name}): ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function main() {
  const target = process.env.RELEASE_NUMBER ? parseInt(process.env.RELEASE_NUMBER) : null;
  const releasesToRun = target ? [target] : Object.keys(PROMPTS).map(Number).sort();
  for (const r of releasesToRun) await runRelease(r);
  console.log('\nDone.');
}

main().catch(console.error);
