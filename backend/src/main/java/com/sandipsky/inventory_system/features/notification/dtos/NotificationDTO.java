package com.sandipsky.inventory_system.features.notification.dtos;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class NotificationDTO {
    private int id;
    private String type;
    private String severity;
    private String title;
    private String message;
    private String actor;

    // Named read (not isRead) so Jackson sees one property, not is_read and read
    @JsonProperty("is_read")
    private boolean read;

    private String createdAt;
}
