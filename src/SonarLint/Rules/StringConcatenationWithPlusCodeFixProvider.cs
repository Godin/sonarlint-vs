﻿/*
 * SonarLint for Visual Studio
 * Copyright (C) 2015 SonarSource
 * sonarqube@googlegroups.com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */

using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CodeFixes;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.CodeAnalysis.CodeActions;
using Microsoft.CodeAnalysis.VisualBasic.Syntax;
using SonarLint.Common;
using Microsoft.CodeAnalysis.VisualBasic;

namespace SonarLint.Rules
{
    [ExportCodeFixProvider(LanguageNames.VisualBasic)]
    public class StringConcatenationWithPlusCodeFixProvider : CodeFixProvider
    {
        internal const string Title = "Change to \"&\"";
        public sealed override ImmutableArray<string> FixableDiagnosticIds
        {
            get
            {
                return ImmutableArray.Create(StringConcatenationWithPlus.DiagnosticId);
            }
        }

        private static readonly FixAllProvider FixAllProviderInstance = new DocumentBasedFixAllProvider<StringConcatenationWithPlus>(
            Title,
            (root, node, diagnostic) => CalculateNewRoot(root, node as BinaryExpressionSyntax));

        public sealed override FixAllProvider GetFixAllProvider()
        {
            return FixAllProviderInstance;
        }

        public override sealed async Task RegisterCodeFixesAsync(CodeFixContext context)
        {
            var root = await context.Document.GetSyntaxRootAsync(context.CancellationToken).ConfigureAwait(false);

            var diagnostic = context.Diagnostics.First();
            var diagnosticSpan = diagnostic.Location.SourceSpan;
            var binary = root.FindNode(diagnosticSpan, getInnermostNodeForTie: true) as BinaryExpressionSyntax;

            if (binary != null)
            {
                context.RegisterCodeFix(
                    CodeAction.Create(
                        Title,
                        c =>
                        {
                            var newRoot = CalculateNewRoot(root, binary);
                            return Task.FromResult(context.Document.WithSyntaxRoot(newRoot));
                        }),
                    context.Diagnostics);
            }
        }

        private static SyntaxNode CalculateNewRoot(SyntaxNode root, BinaryExpressionSyntax currentAsBinary)
        {
            if (currentAsBinary == null)
            {
                return root;
            }

            return root.ReplaceNode(currentAsBinary,
                SyntaxFactory.ConcatenateExpression(
                    currentAsBinary.Left,
                    SyntaxFactory.Token(SyntaxKind.AmpersandToken).WithTriviaFrom(currentAsBinary.OperatorToken),
                    currentAsBinary.Right));
        }
    }
}

