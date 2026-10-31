package com.sandipsky.inventory_system.features.settings.document_numbering.repositories;
import com.sandipsky.inventory_system.features.settings.document_numbering.entities.DocumentNumbering;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;


public interface DocumentNumberingRepository
        extends JpaRepository<DocumentNumbering, Integer>, JpaSpecificationExecutor<DocumentNumbering> {

    Optional<DocumentNumbering> findByName(String name);
}
