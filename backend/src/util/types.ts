export interface IYouTubeApiResponse {
    items: {
        snippet: {
            title: string;
            resourceId: {
                videoId: string;
            };
        };
    }[];
}

export interface IYoutubeVideo {
    title: string;
    url: string;
}