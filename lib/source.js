// source.js - Upload this to Chainlink Functions

// 1. Define the GraphQL Query
const query = `
  query TrendingTracks($first: Int!) {
    allTrendingTracks(first: $first) {
      edges {
        node {
          processedTrackByTrackId {
            id
            title
            artistByArtistId {
              name
            }
          }
        }
      }
    }
  }
`;

// 2. define variables (e.g., fetch top 1 to see the winner)
const variables = { first: 1 };

// 3. Make the HTTP Request
const response = await Functions.makeHttpRequest({
  url: "https://api.spinamp.xyz/v3/graphql",
  method: "POST",
  headers: { "Content-Type": "application/json" },
  data: {
    query: query,
    variables: variables
  }
});

// 4. Handle Errors
if (response.error) {
  throw Error("Request failed");
}

// 5. Parse the Result
const data = response.data.data;
const trendingEdges = data.allTrendingTracks.edges;

if (!trendingEdges || trendingEdges.length === 0) {
  throw Error("No trending tracks found");
}

// 6. Extract the Winner (The #1 Track)
// We extract the Title of the track at index 0
const topTrackTitle = trendingEdges[0].node.processedTrackByTrackId.title;

console.log(`The #1 Trending Track is: ${topTrackTitle}`);

// 7. Return the result to the Smart Contract
// We encode it as a string.
return Functions.encodeString(topTrackTitle);