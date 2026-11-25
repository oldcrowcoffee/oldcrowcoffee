// Default site content. This is what the site shows until the owner saves changes in /admin.
// Text fields that say "lines" may contain line breaks; the last line of an accented title is highlighted.

export const defaults = {
  site: {
    name: 'Old Crow Coffee Company',
    shortName: 'OLD CROW',
    announcement: 'A LITTLE COFFEE. A LOT OF COMMUNITY.',
    announcementTag: 'SPRINGFIELD, OREGON',
    metaDescription: 'Your neighborhood coffee stop in Thurston. Find Old Crow Coffee Company at 6900 Main Street in Springfield, Oregon. See our full menu online.',
    email: 'oldcrowcoffee2025@gmail.com',
    facebookUrl: 'https://www.facebook.com/OldCrowCoffeeCompany',
    facebookLabel: 'Find us on Facebook',
    navFollow: 'Follow the flock',
    address1: '6900 Main Street',
    address2: 'Springfield, OR 97478',
    mapsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Old+Crow+Coffee+Company+6900+Main+St+Springfield+OR+97478',
    footerTagline: 'GOOD COFFEE.\nRIGHT AROUND THE CORNER.',
    footerLocation: 'SPRINGFIELD, OREGON',
    // Optional line in the footer, e.g. a photo credit if a stock photo needs one. Hidden when empty.
    footerCredit: '',
    brandSub: 'COFFEE COMPANY',
    navStory: 'Our story',
    navMenu: 'Menu',
    navFind: 'Find us',
    navToggle: 'Menu',
    backToTop: 'Back to top',
    skipLink: 'Skip to content'
  },
  home: {
    hero: {
      eyebrow: 'YOUR NEIGHBORHOOD COFFEE STOP',
      title: 'GOOD COFFEE.\nGOOD PEOPLE.\nOLD CROW.',
      text: 'Your morning ritual. Your afternoon pick-me-up.\nA little something good, right here in Thurston.',
      button: 'Come on by',
      link: 'Explore the menu',
      foot: '6900 MAIN ST · SPRINGFIELD, OR',
      photo: 'https://images.unsplash.com/photo-1644685223495-3a63162e74fe?auto=format&fit=crop&w=1400&q=85',
      photoAlt: 'A freshly poured latte in a rust-red ceramic cup',
      photoLabel: 'MAKE A LITTLE TIME\nFOR THE GOOD STUFF.',
      sealTop: 'YOUR DAILY',
      sealMain: 'GOOD\nTHING.',
      sealBottom: 'OLD CROW COFFEE'
    },
    // The crow mascot: hover/tap hints, flight messages and what it says when clicked.
    crow: {
      hint: 'Hover or click to fly',
      hintTouch: 'Tap to fly',
      away: 'Caw! Be right back.',
      back: 'Back on my perch.',
      neighborMessages: ['Caw! Well, hello there.', 'You look like good company.', 'Same perch, new friends.', 'See you at the window!'],
      menuMessages: ['Caw! Still brewing.', 'Good things are worth the wait.', 'Keeping an eye on the menu.']
    },
    ticker: ['COFFEE & COMMUNITY', 'BREWED FOR YOUR DAY', 'SEE YOU AT OLD CROW'],
    story: {
      eyebrow: '01 / A LOCAL KIND OF LOVE',
      title: 'A small stop.\nA bright spot in your day.',
      paragraphs: [
        'Early starts, afternoon errands, and all the moments in between. Old Crow is your neighborhood drive-through coffee stop in Springfield’s Thurston community.',
        'Swing by for your usual or find a new favorite. Whatever the day has in store, there’s always time for a good cup and a friendly hello.'
      ]
    },
    menuTeaser: {
      eyebrow: '02 / THE MENU',
      title: 'Your next favorite\nis on the menu.',
      text: 'Scan the code, browse the full menu, and find your next go-to before you pull up.',
      link: 'View the full menu',
      cardLabel: 'OLD CROW / THE MENU',
      cardTitle: 'SCAN FOR\nTHE MENU.',
      qrLabel: 'SCAN OR TAP',
      qrText: 'Your menu.\nOne scan away.',
      tags: 'DRINKS · BLENDED · FAVORITES',
      cardText: 'Most drinks come in 12, 16, 20 and 24 oz.\nKids drinks also available.',
      cardLink: 'See the full menu'
    },
    visit: {
      eyebrow: '03 / WE’LL SEE YOU HERE',
      title: 'Take the\ncoffee route.',
      text: 'Find us on Main Street in Thurston.\nYour next good day starts at the window.',
      button: 'Get directions',
      spotLabel: 'THE SPOT',
      hoursLabel: 'COFFEE HOURS',
      helloLabel: 'SAY HELLO',
      hoursNote: 'Holiday hours may vary. Check Facebook for updates.'
    }
  },
  hours: [
    { label: 'Monday – Friday', time: '5 am – 6 pm' },
    { label: 'Saturday – Sunday', time: '7 am – 6 pm' }
  ],
  menu: {
    metaDescription: 'The full Old Crow Coffee Company menu: classics, favorites, blended drinks, teas and additions. Springfield, Oregon.',
    eyebrow: 'THE MENU',
    title: 'Old Crow\nCoffee Company',
    notice: '',
    sizesNote: 'Most drinks are available in 12oz, 16oz, 20oz and 24oz sizes.',
    kidsNote: 'Kids drinks also available.',
    qrLabel: 'SHARE THE MENU',
    qrText: 'Scan to open this menu on your phone.',
    // Button text for an uploaded PDF menu. {name} becomes the file name.
    pdfLabel: 'Open {name} (PDF)',
    // Address the QR code opens. Blank = automatic (this site's /menu-file, which forwards to the live menu).
    qrUrl: '',
    // 'digital' shows the item lists below. 'upload' shows the files marked live in `files`.
    display: 'digital',
    files: [],
    categories: [
      { name: 'Classics', items: ['House Coffee', 'Cold Brew', 'Americano', 'Breve', 'Latte', 'Mocha', 'White Mocha', 'Hot Cocoa / Steamer'] },
      { name: 'Favorites', items: ['Coconut Dream', 'Hunk A Burnin’ Love', 'Maple Bar Latte', 'Old Crow Mocha', 'Candy Bar Mochas', 'Cozy Campfire', 'Mexican Mocha', 'Wellness Bump'] },
      { name: 'Blended', items: ['The OG', 'Berry Blast', 'Green Monster', 'Peach Bonanza', 'PB & J', 'Power Protein', 'Mocha Milkshake', 'Dirty Turtle', 'Crispety Crunch', 'Worms in Dirt'] },
      { name: 'Other Drinks', items: ['Hot or Iced Tea', 'Matcha', 'Chai Tea', 'Lemonade', 'Italian Soda', 'Redbull / Lotus'] },
      { name: 'Additions', items: ['Alternative Milk', 'Flavor', 'White Chocolate', 'Blended', 'Cold Foam', 'Peanut Butter / Protein Powder', 'Cold Pour', 'Light Ice', 'White Coffee', 'Extra Shots'] }
    ].map(c => ({ name: c.name, items: c.items.map(name => ({ name, price: '', desc: '' })) }))
  }
};
