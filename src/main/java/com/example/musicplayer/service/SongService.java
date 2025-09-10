package com.example.musicplayer.service;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.model.OSSObjectSummary;
import com.aliyun.oss.model.ObjectListing;
import com.example.musicplayer.model.Song;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnThreading;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SongService {

    private final StringRedisTemplate redisTemplate;
    private final OSS ossClient;
    private final String bucketName = "bees-bucket";

    private final Map<String, String> AVAILABLE_FOLDERS = Map.of(
            "dian_gun", "溜冰场",
            "da_si_ma", "大司马",
            "ding_zhen", "丁真",
            "dxl", "东洋雪莲",
            "ha_ji_mi", "哈基米"
    );

    private String currentFolderKey = "dian_gun";

    public SongService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;

        // 从环境变量读取 OSS 配置
        String endpoint = System.getenv("ALIYUN_OSS_ENDPOINT");
        String accessKey = System.getenv("ALIYUN_ACCESS_KEY");
        String secretKey = System.getenv("ALIYUN_SECRET_KEY");

        // 初始化 OSS 客户端
        this.ossClient = new OSSClientBuilder().build(endpoint, accessKey, secretKey);
    }

    // 获取歌曲列表
    public List<Song> getSongs() {
        System.out.println("Redis连接状态: " + (redisTemplate.getConnectionFactory() != null ? "已连接" : "未连接"));
        String folder = AVAILABLE_FOLDERS.get(currentFolderKey);
        String prefix = "music/" + folder + "/";
        ObjectListing objectListing = ossClient.listObjects(bucketName, prefix);

        List<Song> songs = new ArrayList<>();
        for (OSSObjectSummary summary : objectListing.getObjectSummaries()) {
            String key = summary.getKey();
            if (key.toLowerCase().endsWith(".mp3")) {
                String filename = key.substring(key.lastIndexOf("/") + 1);
                String signedUrl = ossClient.generatePresignedUrl(bucketName, key, new Date(System.currentTimeMillis() + 3600 * 1000)).toString();

                Song song = new Song();
                song.setId(Integer.toHexString(key.hashCode()));
                song.setName(filename);
                song.setUrl(signedUrl);
                song.setKey(key);

                songs.add(song);
            }
        }
        return songs;
    }

    // 切换文件夹
    public Map<String, Object> setFolder(String folder) {
        if (AVAILABLE_FOLDERS.containsKey(folder)) {
            currentFolderKey = folder;
            return Map.of("status", "ok", "current", folder);
        }
        return Map.of("error", "Invalid folder key");
    }

    // 获取点赞/点踩数
    public Map<String, Integer> getVotes(String songId) {
        String likes = redisTemplate.opsForValue().get("likes:" + songId);
        String dislikes = redisTemplate.opsForValue().get("dislikes:" + songId);

        return Map.of(
                "likes", likes != null ? Integer.parseInt(likes) : 0,
                "dislikes", dislikes != null ? Integer.parseInt(dislikes) : 0
        );
    }

    // 点赞
    public Map<String, Integer> likeSong(String songId) {
        redisTemplate.opsForValue().increment("likes:" + songId);
        return getVotes(songId);
    }

    // 点踩
    public Map<String, Integer> dislikeSong(String songId) {
        redisTemplate.opsForValue().increment("dislikes:" + songId);
        return getVotes(songId);
    }
}
