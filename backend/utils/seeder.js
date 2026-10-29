const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User.model');
const Hotel = require('../models/Hotel.model');
const Room = require('../models/Room.model');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hotelpro';
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');

    // Clear existing collections
    console.log('Clearing existing database collections...');
    await User.deleteMany();
    await Hotel.deleteMany();
    await Room.deleteMany();

    // 1. Seed Users
    console.log('Seeding initial users...');
    const admin = await User.create({
      firstName: 'Alexander',
      lastName: 'Wright',
      email: 'admin@hotelpro.com',
      password: 'Password123!',
      phone: '+1 (555) 123-4567',
      role: 'admin',
      isEmailVerified: true,
    });

    const staff = await User.create({
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'staff@hotelpro.com',
      password: 'Password123!',
      phone: '+1 (555) 234-5678',
      role: 'staff',
      isEmailVerified: true,
    });

    const guest = await User.create({
      firstName: 'David',
      lastName: 'Kensington',
      email: 'guest@hotelpro.com',
      password: 'Password123!',
      phone: '+1 (555) 345-6789',
      role: 'guest',
      isEmailVerified: true,
    });

    console.log('Users created: Admin, Staff, Guest.');

    // 2. Seed Hotels
    console.log('Seeding luxury hotels...');
    const hotels = await Hotel.insertMany([
      {
        name: 'The Grand Heritage Palace',
        description: 'An architectural icon nestled on the waterfront offering five-star dining, bespoke butler service, and sprawling gardens.',
        address: {
          street: '740 Park Avenue',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          zipCode: '10021',
        },
        phone: '+1 (212) 555-0199',
        email: 'reservations@grandheritagepalace.com',
        starRating: 5,
        amenities: ['Private Butler', 'Michelin Star Dining', 'Infinity Spa', 'Valet Parking', 'High-Speed Wi-Fi'],
        images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80'],
        manager: staff._id,
      },
      {
        name: 'Azure Coastline Sanctuary',
        description: 'Unwind at this seaside retreat featuring panoramic ocean suites, private beachfront cabanas, and world-class wellness therapy.',
        address: {
          street: '100 Ocean Drive',
          city: 'Miami',
          state: 'FL',
          country: 'USA',
          zipCode: '33139',
        },
        phone: '+1 (305) 555-0188',
        email: 'concierge@azurecoastline.com',
        starRating: 5,
        amenities: ['Oceanfront Pool', 'Yacht Charter', 'Private Beach', 'Cocktail Lounge', 'Valet Parking'],
        images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'],
      },
      {
        name: 'Aspen Alpine Chalet & Resort',
        description: 'A cozy yet luxurious mountain sanctuary offering ski-in/ski-out privileges, stone fireplaces, and heated outdoor mineral pools.',
        address: {
          street: '450 Mountain Road',
          city: 'Aspen',
          state: 'CO',
          country: 'USA',
          zipCode: '81611',
        },
        phone: '+1 (970) 555-0177',
        email: 'reservations@aspenchalet.com',
        starRating: 5,
        amenities: ['Ski Valet', 'Heated Mineral Pool', 'Fireplace Suites', 'Fine Dining', 'Spa & Wellness'],
        images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'],
      },
      {
        name: 'Metropolitan Sky Tower',
        description: 'Sky-high glass luxury in the financial epicenter, with panoramic rooftop helipad, infinity pools, and penthouse lounge.',
        address: {
          street: '200 Michigan Avenue',
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          zipCode: '60601',
        },
        phone: '+1 (312) 555-0166',
        email: 'contact@skytowerhotel.com',
        starRating: 4,
        amenities: ['Rooftop Pool', 'Sky Bar', 'Fitness Center', 'Conference Hub', '24/7 Room Service'],
        images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'],
      },
    ]);

    console.log(`Created ${hotels.length} luxury hotel properties.`);

    // 3. Seed Rooms
    console.log('Seeding rooms and suites...');
    const roomDocs = [
      {
        hotel: hotels[0]._id,
        roomNumber: 'PH-01',
        category: 'Presidential',
        type: 'King',
        floor: 28,
        description: 'Opulent penthouse suite with sweeping 360-degree skyline views, marble jacuzzi bath, and private lounge.',
        pricePerNight: 580,
        maxOccupancy: 4,
        size: 1450,
        bedType: '2 California King Beds',
        view: 'Skyline City View',
        amenities: ['Panoramic View', 'Jacuzzi', 'Espresso Bar', 'Soundproofed'],
        images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'],
        status: 'available',
      },
      {
        hotel: hotels[0]._id,
        roomNumber: '2104',
        category: 'Executive',
        type: 'King',
        floor: 21,
        description: 'Designed for discerning travelers featuring ergonomic workspace, Italian leather furnishings, and rainforest shower.',
        pricePerNight: 320,
        maxOccupancy: 2,
        size: 780,
        bedType: '1 King Bed',
        view: 'City View',
        amenities: ['Ocean View', 'Work Station', 'Rain Shower', 'High-Speed Wi-Fi'],
        images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'],
        status: 'available',
      },
      {
        hotel: hotels[0]._id,
        roomNumber: '402',
        category: 'Deluxe',
        type: 'Queen',
        floor: 4,
        description: 'Charming modern room overlooking lush botanical courtyards with a private furnished sun terrace.',
        pricePerNight: 210,
        maxOccupancy: 2,
        size: 520,
        bedType: '1 Queen Bed',
        view: 'Garden Terrace View',
        amenities: ['Private Terrace', 'Smart TV', 'Mini Bar', 'Plush Robes'],
        images: ['https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80'],
        status: 'available',
      },
      {
        hotel: hotels[1]._id,
        roomNumber: 'V-101',
        category: 'Suite',
        type: 'King',
        floor: 1,
        description: 'Direct beachfront private villa with plunge pool, sunbeds, and outdoor rain pavilion.',
        pricePerNight: 490,
        maxOccupancy: 3,
        size: 1100,
        bedType: '1 King Bed + Daybed',
        view: 'Direct Oceanfront',
        amenities: ['Private Plunge Pool', 'Beach Access', 'Butler Service'],
        images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'],
        status: 'available',
      },
      {
        hotel: hotels[2]._id,
        roomNumber: 'CH-301',
        category: 'Suite',
        type: 'King',
        floor: 3,
        description: 'Alpine sanctuary with natural cedar beams, real wood burning fireplace, and heated terrace jacuzzi.',
        pricePerNight: 510,
        maxOccupancy: 4,
        size: 1250,
        bedType: '2 King Beds',
        view: 'Mountain Snow Peaks',
        amenities: ['Fireplace', 'Heated Jacuzzi', 'Ski Lockers'],
        images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'],
        status: 'available',
      },
    ];

    await Room.insertMany(roomDocs);
    console.log(`Created ${roomDocs.length} rooms and suites.`);

    console.log('\n======================================================');
    console.log('✅ HotelPro Database Seed Completed Successfully!');
    console.log('------------------------------------------------------');
    console.log('Demo Credentials:');
    console.log('  Admin:        admin@hotelpro.com   / Password123!');
    console.log('  Receptionist: staff@hotelpro.com   / Password123!');
    console.log('  Guest:        guest@hotelpro.com   / Password123!');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
