import React from 'react';
import { supabase } from './supabase';
import { Region, useRegion } from '../context/RegionContext';

export async function fetchCreatorsForRegion(
  region: Region,
  options?: { creatorType?: string; location?: string; limit?: number }
) {
  let query = supabase
    .from('creator_profiles')
    .select('id, username, display_name, avatar_url, creator_type, location, followers_count, rating, is_verified, region, packages')
    .eq('is_published', true)
    .eq('is_hidden', false)
    .or(`region.eq.${region},region.eq.ANY`);

  if (options?.creatorType) query = query.eq('creator_type', options.creatorType);
  if (options?.location) query = query.eq('location', options.location);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) { console.error('Error fetching creators:', error); return []; }
  return data || [];
}

export function useRegionalCreators(options?: { creatorType?: string; location?: string; limit?: number }) {
  const { region } = useRegion();
  const [creators, setCreators] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchCreatorsForRegion(region, options);
      setCreators(data);
      setLoading(false);
    })();
  }, [region, options?.creatorType, options?.location]);

  return { creators, loading };
}

export async function searchCreators(region: Region, searchTerm: string, limit = 20) {
  const { data, error } = await supabase
    .from('creator_profiles')
    .select('*')
    .or(`region.eq.${region},region.eq.ANY`)
    .eq('is_published', true)
    .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
    .limit(limit);

  if (error) { console.error('Error searching creators:', error); return []; }
  return data || [];
}

export const REGION_SPECIFIC_DATA: Record<Region, { cities: string[]; categories: string[]; languages: string[] }> = {
  UAE: {
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
    categories: ['Reels', 'UGC', 'Ads', 'TikTok'],
    languages: ['English', 'Arabic'],
  },
  KZ: {
    cities: ['Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe'],
    categories: ['Shorts', 'UGC', 'Реклама', 'YouTube'],
    languages: ['Russian', 'Kazakh'],
  },
};
