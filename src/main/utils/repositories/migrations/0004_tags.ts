import Database from 'better-sqlite3'

export function up(db: Database.Database): void {
  // 1. Add global_usage_count column to tags
  const pragma = db.prepare('PRAGMA table_info(tags)').all() as {
    name: string
  }[]
  const hasGlobalUsageCount = pragma.some(
    col => col.name === 'global_usage_count',
  )
  const hasParentId = pragma.some(col => col.name === 'parent_id')
  const hasIcon = pragma.some(col => col.name === 'icon')
  const hasColor = pragma.some(col => col.name === 'color')

  if (!hasIcon) db.exec(`ALTER TABLE tags ADD COLUMN icon TEXT`)
  if (!hasColor) db.exec(`ALTER TABLE tags ADD COLUMN color TEXT`)
  if (!hasParentId)
    db.exec(`
      ALTER TABLE tags ADD COLUMN parent_id INTEGER REFERENCES tags(id);
    `)

  if (!hasGlobalUsageCount)
    db.exec(`
      ALTER TABLE tags ADD COLUMN global_usage_count INTEGER DEFAULT 0;
    `)

  // 2. Populate current global counts
  db.exec(`
    UPDATE tags
    SET global_usage_count = (
      SELECT COUNT(DISTINCT it.image_id)
      FROM image_tags it
      JOIN images i ON i.id = it.image_id
      WHERE it.tag_id = tags.id AND i.deleted_at IS NULL
    )
  `)

  // 3. Create triggers to maintain global_usage_count automatically
  db.exec(`
    -- Trigger for inserting a tag relationship
    CREATE TRIGGER IF NOT EXISTS trg_image_tags_insert
    AFTER INSERT ON image_tags
    FOR EACH ROW
    WHEN (SELECT deleted_at FROM images WHERE id = NEW.image_id) IS NULL
    BEGIN
      UPDATE tags
      SET global_usage_count = global_usage_count + 1
      WHERE id = NEW.tag_id;
    END;

    -- Trigger for deleting a tag relationship
    CREATE TRIGGER IF NOT EXISTS trg_image_tags_delete
    AFTER DELETE ON image_tags
    FOR EACH ROW
    WHEN (SELECT deleted_at FROM images WHERE id = OLD.image_id) IS NULL
    BEGIN
      UPDATE tags
      SET global_usage_count = MAX(0, global_usage_count - 1)
      WHERE id = OLD.tag_id;
    END;

    -- Trigger for soft deleting an image
    CREATE TRIGGER IF NOT EXISTS trg_images_soft_delete
    AFTER UPDATE OF deleted_at ON images
    FOR EACH ROW
    WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
    BEGIN
      UPDATE tags
      SET global_usage_count = MAX(0, global_usage_count - 1)
      WHERE id IN (SELECT tag_id FROM image_tags WHERE image_id = NEW.id);
    END;

    -- Trigger for restoring a soft deleted image
    CREATE TRIGGER IF NOT EXISTS trg_images_restore
    AFTER UPDATE OF deleted_at ON images
    FOR EACH ROW
    WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL
    BEGIN
      UPDATE tags
      SET global_usage_count = global_usage_count + 1
      WHERE id IN (SELECT tag_id FROM image_tags WHERE image_id = NEW.id);
    END;
  `)
}
