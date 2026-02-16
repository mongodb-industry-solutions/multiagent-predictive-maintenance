import { NextResponse } from 'next/server'
import getMongoClientPromise from '../../../integrations/mongodb/client.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const collection = searchParams.get('collection')
    const filterParam = searchParams.get('filter')
    
    if (!collection) {
      return NextResponse.json(
        { error: 'Collection parameter is required' }, 
        { status: 400 }
      )
    }

    const client = await getMongoClientPromise()
    const db = client.db(process.env.DATABASE_NAME)
    
    // Parse filter if provided
    let filter = {}
    if (filterParam) {
      try {
        filter = JSON.parse(filterParam)
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Invalid filter JSON format' }, 
          { status: 400 }
        )
      }
    }
    
    const data = await db.collection(collection).find(filter).toArray()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' }, 
      { status: 500 }
    )
  }
}