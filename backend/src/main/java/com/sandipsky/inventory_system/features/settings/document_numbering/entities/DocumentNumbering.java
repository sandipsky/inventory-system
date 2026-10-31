package com.sandipsky.inventory_system.features.settings.document_numbering.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
@Table(name = "document_numbering")
public class DocumentNumbering {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false)
    private String name;

    private String prefix;

    @Column(name = "body_length")
    private int bodyLength;

    @Column(name = "start_no")
    private int startNo;

    @Column(name = "end_no")
    private int endNo;
}
