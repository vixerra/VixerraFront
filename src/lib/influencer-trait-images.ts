// Picture tiles for the AI influencer builder's trait options, served from
// public/influencer/traits/<group>/<option>.webp (165px square WebP, a few KB
// each). Which options have one is listed here rather than probed, so a
// missing tile costs no 404: the option falls back to an icon placeholder.
// Generated from the files on disk; keep it in step when tiles are added.
const TRAIT_IMAGES: Record<string, readonly string[]> = {
  characterType: ["human", "elf", "alien", "cyborg", "vampire", "orc", "goblin", "troll", "zombie", "reptile", "mannequin"],
  comicLevel: ["subtle", "quirky", "caricature", "extreme"],
  ethnicity: ["african", "east-asian", "south-asian", "southeast-asian", "middle-eastern", "north-african", "latino", "european", "indigenous", "pacific-islander", "mixed"],
  build: ["skinny", "lanky", "average", "athletic", "bodybuilder", "stocky", "chubby", "pot-belly", "plus-size"],
  height: ["very-short", "short", "average", "tall", "very-tall"],
  proportions: ["balanced", "big-head", "small-head", "long-legs", "short-legs", "broad-shoulders", "long-torso", "long-arms"],
  hairstyle: ["baroque-curls", "powdered-wig", "beehive", "pompadour", "giant-afro", "afro-puffs", "mullet", "bowl-cut", "mushroom", "helmet-bob", "mohawk", "liberty-spikes", "spiky", "comb-over", "horseshoe", "rat-tail", "victory-rolls", "slicked-back", "long-straight", "long-wavy", "curly-bob", "pixie", "wolf-cut", "bun", "space-buns", "pigtails", "box-braids", "cornrows", "locs", "man-bun", "buzz-cut", "bald"],
  headShape: ["oval", "round", "square", "long", "heart", "egg", "pear", "triangle"],
  eyeShape: ["almond", "round", "hooded", "monolid", "droopy", "wide-set", "close-set", "tiny"],
  features: ["unibrow", "bushy-brows", "big-nose", "hooked-nose", "button-nose", "big-ears", "gap-teeth", "big-grin", "square-jaw", "long-chin", "double-chin", "cleft-chin", "rosy-cheeks", "dimples", "high-cheekbones", "full-lips", "freckles"],
  facialHair: ["clean", "stubble", "pencil", "handlebar", "walrus", "mutton-chops", "goatee", "braided-goatee", "soul-patch", "full-beard", "viking", "wizard"],
  neck: ["short", "average", "long", "very-long", "thick"],
  distinctive: ["gold-tooth", "face-tattoo", "neck-tattoo", "sleeves", "scar", "gauges", "nose-ring", "septum", "vitiligo", "heterochromia", "beauty-mark", "glitter", "sunburn", "nose-plaster"],
  expression: ["deadpan", "smug", "smiling", "surprised", "grumpy", "dreamy", "intense"],
  style: ["velvet-blazer", "baroque", "disco", "aerobics", "grandpa", "tracksuit", "track-jacket", "mohair", "leather-flares", "hawaiian", "streetwear", "suit", "tuxedo", "old-money", "rockstar", "cowboy", "pirate", "space-suit", "superhero", "chef", "lab-coat", "goth", "techwear"],
  accessories: ["monocle", "round-glasses", "sunglasses", "wraparound", "earmuffs", "skull-cap", "aviators", "gold-chains", "pearls", "top-hat", "cowboy-hat", "crown", "beret", "headphones", "bow-tie", "feather-boa", "eye-patch", "cane", "handbag"],
};

const lookup = new Map(Object.entries(TRAIT_IMAGES).map(([group, ids]) => [group, new Set(ids)]));

/** True when the group is shown as picture tiles. */
export function groupHasImages(groupId: string): boolean {
  return lookup.has(groupId);
}

/** The option's tile, or null when it has none yet. */
export function traitImage(groupId: string, optionId: string): string | null {
  return lookup.get(groupId)?.has(optionId) ? `/influencer/traits/${groupId}/${optionId}.webp` : null;
}
