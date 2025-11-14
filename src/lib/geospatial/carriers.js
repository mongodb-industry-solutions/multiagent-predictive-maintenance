import getMongoClientPromise from '../../integrations/mongodb/client.js';

/**
 * Find the nearest carriers to a specific location using MongoDB geospatial queries
 * 
 * @param {number} longitude - Longitude of the search location (-180 to 180)
 * @param {number} latitude - Latitude of the search location (-90 to 90) 
 * @param {number} maxDistanceKm - Maximum search radius in kilometers (default: 2000km)
 * @param {number} limit - Maximum number of carriers to return (default: 5)
 * @returns {Promise<Array>} Array of carriers sorted by distance (nearest first) with distance_km field
 */
export async function findNearestCarriers(longitude, latitude, maxDistanceKm = 2000, limit = 5) {
  try {
    const client = await getMongoClientPromise();
    const db = client.db(process.env.DATABASE_NAME);
    const carriersCollection = db.collection('carriers');

    // MongoDB $geoNear aggregation pipeline for geospatial search
    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          distanceField: 'distance_meters',
          maxDistance: maxDistanceKm * 1000, // Convert km to meters
          spherical: true,
          key: 'headquarters.coordinates' // Use headquarters location index
        }
      },
      {
        // Add distance in kilometers for easier reading
        $addFields: {
          distance_km: {
            $round: [{ $divide: ['$distance_meters', 1000] }, 1]
          }
        }
      },
      {
        $limit: limit
      }
    ];

    console.log(`🔍 Searching for carriers near [${longitude}, ${latitude}] within ${maxDistanceKm}km`);

    const carriers = await carriersCollection.aggregate(pipeline).toArray();

    console.log(`✅ Found ${carriers.length} carriers within ${maxDistanceKm}km`);
    
    // Log results for debugging
    carriers.forEach((carrier, index) => {
      console.log(`${index + 1}. ${carrier.name} (${carrier.headquarters.city}, ${carrier.headquarters.state}) - ${carrier.distance_km}km`);
    });

    return carriers;

  } catch (error) {
    console.error('❌ Error in findNearestCarriers:', error);
    throw new Error(`Failed to find nearest carriers: ${error.message}`);
  }
}

/**
 * Find carriers that serve a specific location (point within service area)
 * 
 * @param {number} longitude - Longitude of the location to check
 * @param {number} latitude - Latitude of the location to check
 * @returns {Promise<Array>} Array of carriers whose service area includes this location
 */
export async function findCarriersForLocation(longitude, latitude) {
  try {
    const client = await getMongoClientPromise();
    const db = client.db(process.env.DATABASE_NAME);
    const carriersCollection = db.collection('carriers');

    // MongoDB $geoWithin query to find carriers serving this location
    const query = {
      service_area_geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        }
      }
    };

    console.log(`🗺️  Searching for carriers serving location [${longitude}, ${latitude}]`);

    const carriers = await carriersCollection.find(query).toArray();

    console.log(`✅ Found ${carriers.length} carriers serving this location`);

    return carriers;

  } catch (error) {
    console.error('❌ Error in findCarriersForLocation:', error);
    throw new Error(`Failed to find carriers for location: ${error.message}`);
  }
}