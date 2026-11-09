BEGIN;

 
-- 1. Cria a entidade de coleta --

CREATE TABLE collection (
    id_collection BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    service_id_service INTEGER NOT NULL,

    status VARCHAR(20) NOT NULL,

    failure_reason VARCHAR(100),

    http_status SMALLINT,

    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Usada somente durante esta migration para associar
    -- as métricas antigas às novas collections.
    legacy_metrics_id BIGINT UNIQUE,

    FOREIGN KEY (service_id_service)
        REFERENCES service(id_service)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT chk_collection_status
        CHECK (
            status IN (
                'success',
                'no_metrics',
                'unavailable',
                'error'
            )
        ),

    CONSTRAINT chk_collection_failure_reason
        CHECK (
            (status = 'success' AND failure_reason IS NULL)
            OR status <> 'success'
        ),

    CONSTRAINT chk_collection_http_status
        CHECK (
            http_status IS NULL
            OR http_status BETWEEN 100 AND 599
        )
);

CREATE INDEX idx_collection_service_attempted
    ON collection (service_id_service, attempted_at DESC);


-- - 2. Converte as métricas antigas em coletas bem-sucedidas --
INSERT INTO collection (
    service_id_service,
    status,
    attempted_at,
    legacy_metrics_id
)
SELECT
    service_id_service,
    'success',
    recorded_at,
    id_metrics
FROM metrics;



-- 3. Adiciona a nova FK em metrics -- 

ALTER TABLE metrics
    ADD COLUMN collection_id_collection BIGINT;


-- 4. Relaciona cada metrics antiga à collection criada -- 

UPDATE metrics AS m
SET collection_id_collection = c.id_collection
FROM collection AS c
WHERE c.legacy_metrics_id = m.id_metrics;


-- 5. Agora que todas estão relacionadas, torna NOT NULL --

ALTER TABLE metrics
    ALTER COLUMN collection_id_collection SET NOT NULL;


-- 6. Garante relação 1 : 0..1 --

ALTER TABLE metrics
    ADD CONSTRAINT uq_metrics_collection
        UNIQUE (collection_id_collection);



-- 7. Cria FK metrics -> collection -- 

ALTER TABLE metrics
    ADD CONSTRAINT metrics_collection_id_collection_fkey
        FOREIGN KEY (collection_id_collection)
        REFERENCES collection(id_collection)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;



-- 8. Remove o relacionamento antigo metrics -> service -- 

ALTER TABLE metrics
    DROP CONSTRAINT metrics_service_id_service_fkey;

ALTER TABLE metrics
    DROP COLUMN service_id_service;


-- 9. Remove a coluna temporária usada pela migration --

ALTER TABLE collection
    DROP COLUMN legacy_metrics_id;


COMMIT;