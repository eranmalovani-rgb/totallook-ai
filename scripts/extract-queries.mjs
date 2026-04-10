import fs from "fs";

const data = JSON.parse(fs.readFileSync("scripts/catalog-data.json", "utf-8"));

function getTopItems(gender, limit) {
  const items = data.filter(i => i.gender === gender);
  const priority = ['tops', 'pants', 'shoes', 'jackets', 'dresses', 'accessories'];
  const result = [];
  const activeCats = priority.filter(p => items.some(i => i.category === p));
  const perCat = Math.ceil(limit / activeCats.length);
  
  for (const cat of priority) {
    const catItems = items.filter(i => i.category === cat);
    const seen = new Set();
    const picked = [];
    for (const item of catItems) {
      if (picked.length >= perCat) break;
      const sub = item.subCategory || item.name;
      if (seen.has(sub) === false) {
        seen.add(sub);
        picked.push(item);
      }
    }
    for (const item of catItems) {
      if (picked.length >= perCat) break;
      if (picked.includes(item) === false) picked.push(item);
    }
    result.push(...picked);
  }
  return result.slice(0, limit);
}

const women = getTopItems('female', 120);
const men = getTopItems('male', 80);
const all = [...women, ...men];

const queries = all.map((item) => ({
  idx: data.indexOf(item),
  query: item.productSearchQuery || `${item.name} ${item.brand} product photo`,
  name: item.name,
  gender: item.gender,
  category: item.category,
}));

fs.writeFileSync('scripts/image-queries.json', JSON.stringify(queries, null, 2));
console.log('Total queries:', queries.length);
console.log('Women:', queries.filter(q => q.gender === 'female').length);
console.log('Men:', queries.filter(q => q.gender === 'male').length);

// Print category breakdown
const cats = {};
for (const q of queries) {
  const key = `${q.gender}-${q.category}`;
  cats[key] = (cats[key] || 0) + 1;
}
console.log('\nCategory breakdown:');
Object.entries(cats).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
