export const locations = [
  {
    id: 'cafe',
    name: 'Maya\'s Cafe',
    emoji: '☕',
    description: 'Cozy corner cafe with the smell of fresh coffee and pastries. The heart of morning routines.'
  },
  {
    id: 'park',
    name: 'Memorial Park',
    emoji: '🌳',
    description: 'Green space with benches, walking paths, and a small pond. Where people go to think.'
  },
  {
    id: 'shop',
    name: 'Blake\'s General Store',
    emoji: '🏪',
    description: 'The only general store in town. Sells everything from groceries to hardware. Jordan knows everyone.'
  },
  {
    id: 'library',
    name: 'Town Library',
    emoji: '📚',
    description: 'Quiet sanctuary of books. Sam practically lives here on weekends.'
  },
  {
    id: 'homes',
    name: 'Residential Area',
    emoji: '🏠',
    description: 'Various homes and apartments where residents live. Private spaces, rest, solitude.'
  },
  {
    id: 'school',
    name: 'Simcity.AI School',
    emoji: '🏫',
    description: 'Small community school where Sam teaches. Empty after hours but full of memories.'
  },
  {
    id: 'town_square',
    name: 'Town Square',
    emoji: '🏛️',
    description: 'Central gathering place with the community board, benches, and a clock tower. Events happen here.'
  },
  {
    id: 'office',
    name: 'Community Office',
    emoji: '💼',
    description: 'Shared workspace and meeting rooms. Where Alex tries to organize community projects.'
  }
];

export type LocationId = typeof locations[number]['id'];
