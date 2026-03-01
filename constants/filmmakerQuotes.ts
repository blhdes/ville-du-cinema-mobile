export interface FilmmakerQuote {
  id: number; // 0-51 (week of year)
  author: string;
  nationality: string;
  text: string;
}

export const FILMMAKER_QUOTES: FilmmakerQuote[] = [
  { id: 0, author: "Jean-Luc Godard", nationality: "France", text: "Photography is truth. Cinema is truth twenty-four times per second." },
  { id: 1, author: "François Truffaut", nationality: "France", text: "I've always preferred the reflection of life to life itself." },
  { id: 2, author: "Robert Bresson", nationality: "France", text: "Cinematography is writing with moving images and sounds." },
  { id: 3, author: "Andreï Tarkovski", nationality: "Russie", text: "Cinema sculpts time." },
  { id: 4, author: "Jean Cocteau", nationality: "France", text: "Cinema is not a spectacle, it is a form of writing." },
  { id: 5, author: "Alfred Hitchcock", nationality: "Royaume-Uni", text: "For me, suspense is giving the audience information the characters don't have." },
  { id: 6, author: "Ingmar Bergman", nationality: "Suède", text: "My films are questions being asked." },
  { id: 7, author: "Orson Welles", nationality: "États-Unis", text: "The enemy of cinema is the screenplay." },
  { id: 8, author: "Federico Fellini", nationality: "Italie", text: "I don't tell stories, I show people." },
  { id: 9, author: "Akira Kurosawa", nationality: "Japon", text: "In a good film, every scene must be necessary." },
  { id: 10, author: "Jean Renoir", nationality: "France", text: "The rule of the game is that there are no rules." },
  { id: 11, author: "Luis Buñuel", nationality: "Espagne", text: "Cinema is an eye open to the world." },
  { id: 12, author: "Yasujirō Ozu", nationality: "Japon", text: "Cinema is the art of seeing differently." },
  { id: 13, author: "Carl Theodor Dreyer", nationality: "Danemark", text: "The dream is the only reality that matters." },
  { id: 14, author: "Jean Epstein", nationality: "France", text: "Cinema begins where words stop." },
  { id: 15, author: "Sergueï Eisenstein", nationality: "Russie", text: "Editing is the essence of cinema." },
  { id: 16, author: "Fritz Lang", nationality: "Allemagne", text: "Destiny is the hidden director." },
  { id: 17, author: "Michelangelo Antonioni", nationality: "Italie", text: "Cinema doesn't film reality, it reveals it." },
  { id: 18, author: "Pier Paolo Pasolini", nationality: "Italie", text: "The sacred and the profane are never separate." },
  { id: 19, author: "Éric Rohmer", nationality: "France", text: "Cinema must be a way of seeing the world." },
  { id: 20, author: "Jacques Rivette", nationality: "France", text: "The tracking shot is a matter of morality." },
  { id: 21, author: "Agnès Varda", nationality: "France", text: "Cinema is the art of watching people live." },
  { id: 22, author: "Chris Marker", nationality: "France", text: "Memory is the only editing that matters." },
  { id: 23, author: "Alain Resnais", nationality: "France", text: "Time in cinema is not clock time." },
  { id: 24, author: "Chantal Akerman", nationality: "Belgique", text: "Cinema is writing with time." },
  { id: 25, author: "Werner Herzog", nationality: "Allemagne", text: "A film is never finished, it's abandoned." },
  { id: 26, author: "Rainer Werner Fassbinder", nationality: "Allemagne", text: "Cinema is the impossibility of dying." },
  { id: 27, author: "Wim Wenders", nationality: "Allemagne", text: "Cinema is made for wasting time." },
  { id: 28, author: "Jean-Marie Straub", nationality: "France", text: "Cinema must show the invisible." },
  { id: 29, author: "Marguerite Duras", nationality: "France", text: "To write is to film. To film is to write." },
  { id: 30, author: "Jacques Tati", nationality: "France", text: "A good film starts with a good title." },
  { id: 31, author: "Satyajit Ray", nationality: "Inde", text: "Cinema is the art of not showing." },
  { id: 32, author: "Abbas Kiarostami", nationality: "Iran", text: "Cinema is a question of truth." },
  { id: 33, author: "Terrence Malick", nationality: "États-Unis", text: "Beauty is in the gaze, never in the object." },
  { id: 34, author: "Stanley Kubrick", nationality: "États-Unis", text: "A film is a world seen through a keyhole." },
  { id: 35, author: "John Cassavetes", nationality: "États-Unis", text: "Cinema is a question of love." },
  { id: 36, author: "Kenji Mizoguchi", nationality: "Japon", text: "Silence in cinema is as important as speech in theater." },
  { id: 37, author: "Manoel de Oliveira", nationality: "Portugal", text: "Time is the only thing that matters in cinema." },
  { id: 38, author: "Theo Angelopoulos", nationality: "Grèce", text: "Cinema is the art of time that passes and remains." },
  { id: 39, author: "Béla Tarr", nationality: "Hongrie", text: "Cinema is time flowing." },
  { id: 40, author: "Pedro Costa", nationality: "Portugal", text: "Cinema is an art of presence." },
  { id: 41, author: "Claire Denis", nationality: "France", text: "Cinema is the flesh of the world." },
  { id: 42, author: "Hong Sang-soo", nationality: "Corée du Sud", text: "Cinema is made of repetitions and chance." },
  { id: 43, author: "Apichatpong Weerasethakul", nationality: "Thaïlande", text: "Cinema is sculpting with light." },
  { id: 44, author: "Bruno Dumont", nationality: "France", text: "Cinema is a question of gazes." },
  { id: 45, author: "Lav Diaz", nationality: "Philippines", text: "Time in cinema is the time it takes." },
  { id: 46, author: "Kelly Reichardt", nationality: "États-Unis", text: "Cinema is life without the boring parts." },
  { id: 47, author: "Céline Sciamma", nationality: "France", text: "Cinema is a question of desire." },
  { id: 48, author: "Lucrecia Martel", nationality: "Argentine", text: "Cinema is seeing what cannot be said." },
  { id: 49, author: "Tsai Ming-liang", nationality: "Taïwan", text: "Cinema is the art of pure time." },
  { id: 50, author: "Philippe Garrel", nationality: "France", text: "Cinema is the childhood of art." },
  { id: 51, author: "Leos Carax", nationality: "France", text: "Cinema is made of images and blood." }
];

export function getQuoteOfTheWeek(): FilmmakerQuote {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const weekOfYear = Math.floor(diff / oneWeek);
  return FILMMAKER_QUOTES[weekOfYear % 52];
}
