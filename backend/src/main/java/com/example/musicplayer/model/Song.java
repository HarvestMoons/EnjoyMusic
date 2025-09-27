package com.example.musicplayer.model;

import lombok.Data;

@Data
public class Song {
    private String id;
    private String name;
    private String url;
    private String key;
}
