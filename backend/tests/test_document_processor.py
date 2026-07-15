import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import document_processor


def test_read_text_on_seeded_files():
    docs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'documents')
    assert os.path.exists(docs_dir)
    files = [f for f in os.listdir(docs_dir) if f.endswith('.txt')]
    assert files, "No seeded text documents found for tests"
    # Read first file
    p = os.path.join(docs_dir, files[0])
    text = document_processor.read_text(p)
    assert isinstance(text, str)
    assert len(text) > 0
